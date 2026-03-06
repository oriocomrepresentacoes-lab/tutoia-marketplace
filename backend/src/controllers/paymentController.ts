import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'TEST-8717720018985870-081800-c90646584c30ef51e25ccd2acf83eed0-225625396';
const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

export const createPayment = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Não autorizado' });

        const user = await prisma.user.findUnique({ where: { id: user_id } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const {
            type, // 'BANNER' | 'AD_IMAGES'
            ad_id, // For 'AD_IMAGES'
            payment_method_id, // 'pix' or card flag
            token, // Card token, if applicable
            installments, // Card installments, if applicable
            payer_first_name, // For PIX
            payer_last_name, // For PIX
            payer_cpf // For PIX
        } = req.body;

        // Pricing logic (Lowered for production testing)
        const transaction_amount = type === 'BANNER' ? 1.00 : 1.00; // Original: type === 'BANNER' ? 50.00 : 25.00;
        const description = type === 'BANNER' ? 'Adesão de Banner - TutShop' : 'Adesão de +Imagens - TutShop';

        // Create transaction in DB
        const transaction = await prisma.transaction.create({
            data: {
                user_id,
                type,
                ad_id,
                transaction_amount,
                payment_method: payment_method_id,
                status: 'PENDING'
            }
        });

        // Build Payload
        const payload: any = {
            transaction_amount,
            description,
            payment_method_id,
            external_reference: transaction.id,
            payer: {
                email: user.email
            }
        };

        if (payment_method_id === 'pix') {
            payload.payer.first_name = payer_first_name;
            payload.payer.last_name = payer_last_name;
            payload.payer.identification = {
                type: 'CPF',
                number: payer_cpf
            };
        } else {
            // Credit card
            payload.token = token;
            payload.installments = installments || 1;
        }

        const idempotencyKey = `${transaction.id}-${Date.now()}`;

        // Send to Mercado Pago
        const response = await fetch(MP_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(payload)
        });

        const mpData = await response.json();
        const isResponseOk = response.ok;

        if (!isResponseOk) {
            console.error('Mercado Pago Error:', mpData);
            return res.status(400).json({ error: 'Falha no pagamento no gateway', details: mpData });
        }

        // Update transaction with MP ID
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                payment_id: String(mpData.id),
                status: mpData.status === 'approved' ? 'APPROVED' : 'PENDING',
                expires_at: mpData.status === 'approved' ? new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) : null
            }
        });

        res.status(201).json({
            transaction_id: transaction.id,
            status: mpData.status,
            qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno do servidor ao criar o pagamento' });
    }
};

export const paymentWebhook = async (req: Request, res: Response) => {
    try {
        const { action, data, type } = req.body;

        // Mercado Pago sends notifications in a few formats:
        // 1. Webhooks: { "action": "payment.updated", "data": { "id": "123456" } }
        // 2. IPN: query param id=123456 and topic=payment

        let paymentId = req.query.id || req.query['data.id'] || data?.id;

        if (!paymentId && type === 'payment') {
            paymentId = req.body.data?.id;
        }

        if (paymentId) {
            // Fetch exact payment status from MP API to avoid spoofing
            const response = await fetch(`${MP_API_URL}/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
                }
            });

            if (response.ok) {
                const mpData: any = await response.json();
                const externalReference = mpData.external_reference; // Our transaction ID

                if (externalReference) {
                    const transaction = await prisma.transaction.findUnique({
                        where: { id: externalReference }
                    });

                    if (transaction && transaction.status !== 'APPROVED') {
                        if (mpData.status === 'approved') {
                            await prisma.transaction.update({
                                where: { id: externalReference },
                                data: {
                                    status: 'APPROVED',
                                    payment_id: String(paymentId),
                                    expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
                                }
                            });
                        } else if (mpData.status === 'rejected' || mpData.status === 'cancelled') {
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
            } else {
                console.error('Webhook: failed to verify payment ID with Mercado Pago');
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Error');
    }
};
