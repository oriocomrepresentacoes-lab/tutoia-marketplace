import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN, options: { timeout: 5000 } });
const payment = new Payment(client);

console.log('--- SYSTEM BOOT (SDK V1.5.0) ---');
console.log('MP_ACCESS_TOKEN status:', MP_ACCESS_TOKEN ? 'PRESENT' : 'MISSING');

export const createPayment = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const user = await prisma.user.findUnique({ where: { id: user_id } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const {
            type, // 'BANNER' | 'AD_IMAGES'
            ad_id, // For 'AD_IMAGES'
            payer_first_name,
            payer_last_name,
            payer_cpf
        } = req.body;

        if (!payer_first_name || !payer_last_name || !payer_cpf) {
            return res.status(400).json({ error: 'Dados do pagador (Nome, Sobrenome, CPF) são obrigatórios para PIX.' });
        }

        // Pricing logic (Restored back to 1.00 for testing purposes)
        const transaction_amount = type === 'BANNER' ? 1.00 : 1.00; // Original: 50.00 / 25.00
        const description = type === 'BANNER' ? 'Adesão de Banner - TutShop' : 'Adesão de +Imagens - TutShop';

        // Create transaction in DB
        const transaction = await prisma.transaction.create({
            data: {
                user_id,
                type,
                ad_id,
                transaction_amount,
                payment_method: 'pix',
                status: 'PENDING'
            }
        });

        // Auto-detect backend URL for webhooks
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const host = req.headers.host;
        const notification_url = process.env.VITE_API_URL
            ? `${process.env.VITE_API_URL}/api/payments/webhook`
            : `${protocol}://${host}/api/payments/webhook`;

        console.log('--- GENERATING PIX ---');
        console.log('Notification URL set to:', notification_url);

        // Build Payload strictly for PIX
        const payload: any = {
            transaction_amount,
            description,
            payment_method_id: 'pix',
            external_reference: transaction.id,
            notification_url,
            payer: {
                email: user.email,
                first_name: payer_first_name,
                last_name: payer_last_name,
                identification: {
                    type: 'CPF',
                    number: payer_cpf.replace(/\D/g, '')
                }
            }
        };

        const idempotencyKey = `${transaction.id}-${Date.now()}`;

        console.log('--- SENDING TO MERCADO PAGO SDK (V2.0.0 PIX ONLY) ---');
        console.log('Payload Body:', JSON.stringify(payload, null, 2));

        try {
            const result = await payment.create({
                body: payload,
                requestOptions: { idempotencyKey }
            });

            console.log('--- MERCADO PAGO SDK RESPONSE ---', result.status);

            // Update transaction with MP ID
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    payment_id: String(result.id),
                    status: result.status === 'approved' ? 'APPROVED' : 'PENDING',
                    expires_at: result.status === 'approved' ? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) : null
                }
            });

            return res.status(201).json({
                transaction_id: transaction.id,
                status: result.status,
                qr_code: result.point_of_interaction?.transaction_data?.qr_code,
                qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
                ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
            });

        } catch (sdkError: any) {
            console.log('CRITICAL SDK ERROR DETAIL:', JSON.stringify(sdkError, null, 2));
            return res.status(400).json({
                error: 'Falha no pagamento no gateway (SDK)',
                details: sdkError
            });
        }

    } catch (error) {
        console.error('Create Payment Error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

export const paymentWebhook = async (req: Request, res: Response) => {
    try {
        console.log('--- WEBHOOK INCOMING REQUEST ---');
        console.log('Headers:', req.headers);
        console.log('Query:', req.query);
        console.log('Body:', req.body);

        const { data, type } = req.body;
        let paymentId = req.query.id || req.query['data.id'] || data?.id;

        if (!paymentId && type === 'payment') {
            paymentId = req.body.data?.id;
        }

        console.log('Parsed Payment ID:', paymentId);

        if (paymentId) {
            try {
                const result = await payment.get({ id: String(paymentId) });
                const externalReference = result.external_reference;
                console.log('MP Payment Data:', { id: result.id, status: result.status, external_reference: externalReference });

                if (externalReference) {
                    const transaction = await prisma.transaction.findUnique({
                        where: { id: externalReference }
                    });

                    if (transaction) {
                        console.log('DB Transaction Found:', transaction.id, 'Current Status:', transaction.status);

                        if (result.status === 'approved' && transaction.status !== 'APPROVED') {
                            await prisma.transaction.update({
                                where: { id: externalReference },
                                data: {
                                    status: 'APPROVED',
                                    payment_id: String(paymentId),
                                    expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
                                }
                            });

                            const { io } = require('../index');
                            if (io) {
                                io.to(transaction.user_id).emit('payment_approved', {
                                    transaction_id: externalReference,
                                    type: transaction.type,
                                    message: transaction.type === 'BANNER'
                                        ? 'Seu pagamento do Banner foi aprovado!'
                                        : 'Seu pagamento de Mais Imagens foi aprovado!'
                                });
                            }
                        } else if ((result.status === 'rejected' || result.status === 'cancelled') && transaction.status === 'PENDING') {
                            await prisma.transaction.update({
                                where: { id: externalReference },
                                data: {
                                    status: 'REJECTED',
                                    payment_id: String(paymentId)
                                }
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Webhook SDK Error:', err);
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
};
