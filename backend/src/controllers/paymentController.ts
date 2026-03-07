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
            payment_method_id, // 'pix' or card flag
            token, // Card token, if applicable
            installments, // Card installments, if applicable
            payer_first_name, // For PIX/Card
            payer_last_name, // For PIX/Card
            payer_cpf, // For PIX/Card
            issuer_id // For Card
        } = req.body;

        // Pricing logic (Lowered for final production testing)
        const transaction_amount = type === 'BANNER' ? 1.00 : 1.00; // Final prices: type === 'BANNER' ? 50.00 : 25.00;
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
            // Credit card logic with backend tokenization fail-safe
            let finalToken = token;
            let finalPaymentMethodId = payment_method_id;

            // Detect if token is mock or if we should tokenize from backend
            const isMockToken = !token || token.startsWith('mock_') || token.startsWith('tok_test') || token.length < 20;
            const hasRawData = !!(req.body.cardNumber || req.body.card_data_fallback);

            console.log('--- TOKEN ANALYSIS ---');
            console.log('Token:', token);
            console.log('isMockToken:', isMockToken);
            console.log('hasRawData:', hasRawData);
            console.log('Available keys in body:', Object.keys(req.body));

            if (isMockToken && hasRawData) {
                console.log('--- BACKEND TOKENIZATION TRIGGERED ---');
                const rawData = req.body.card_data_fallback || {
                    card_number: req.body.cardNumber?.replace(/\s/g, ''),
                    cardholder_name: req.body.cardholder_name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(),
                    expiration_month: req.body.cardExpiry ? parseInt(req.body.cardExpiry.split('/')[0]) : req.body.expiration_month,
                    expiration_year: req.body.cardExpiry ? parseInt(req.body.cardExpiry.split('/')[1]) : req.body.expiration_year,
                    security_code: req.body.cardCvv || req.body.security_code,
                    cpf: (req.body.cpf || req.body.payer_cpf)?.replace(/\D/g, '')
                };

                if (rawData.card_number && rawData.expiration_month && rawData.expiration_year && rawData.security_code) {
                    let expYear = rawData.expiration_year;
                    if (String(expYear).length === 2) {
                        expYear = 2000 + parseInt(String(expYear));
                    }

                    try {
                        const tokenResponse = await fetch('https://api.mercadopago.com/v1/card_tokens', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                card_number: rawData.card_number,
                                cardholder: {
                                    name: rawData.cardholder_name || 'TITULAR',
                                    identification: { type: 'CPF', number: rawData.cpf || '00000000000' }
                                },
                                expiration_month: parseInt(String(rawData.expiration_month)),
                                expiration_year: expYear,
                                security_code: String(rawData.security_code)
                            })
                        });

                        const tokenData: any = await tokenResponse.json();
                        if (tokenResponse.ok && tokenData.id) {
                            finalToken = tokenData.id;
                            console.log('Backend generated Token:', finalToken);
                            if (tokenData.bin_attributes?.brand?.code) {
                                finalPaymentMethodId = tokenData.bin_attributes.brand.code;
                            }
                        } else {
                            console.error('Backend Tokenization Failed:', tokenData);
                            // Se a tokenização falhou no backend, avisar o usuário do motivo real
                            return res.status(400).json({
                                error: 'Falha ao tokenizar cartão no servidor',
                                details: tokenData
                            });
                        }
                    } catch (err) {
                        console.error('Backend Tokenization Error:', err);
                        return res.status(500).json({ error: 'Erro de conexão com o gateway de tokenização' });
                    }
                }
            }

            payload.token = finalToken;
            payload.payment_method_id = finalPaymentMethodId;
            payload.issuer_id = issuer_id || req.body.issuer_id;
            payload.installments = installments || 1;

            // Compliance & Anti-fraud (Obrigatório em produção para aprovação)
            payload.additional_info = {
                items: [
                    {
                        id: transaction.id,
                        title: description,
                        description: description,
                        quantity: 1,
                        unit_price: Number(transaction_amount)
                    }
                ],
                payer: {
                    first_name: payer_first_name || user.name.split(' ')[0],
                    last_name: payer_last_name || user.name.split(' ').slice(1).join(' ')
                }
            };

            // Identificação CPF (Sempre recomendada em Cartão Produção)
            if (payer_cpf) {
                payload.payer.first_name = payer_first_name || user.name.split(' ')[0];
                payload.payer.last_name = payer_last_name || user.name.split(' ').slice(1).join(' ');
                payload.payer.identification = {
                    type: 'CPF',
                    number: payer_cpf.replace(/\D/g, '')
                };
            }
        }

        const idempotencyKey = `${transaction.id}-${Date.now()}`;

        console.log('--- SENDING TO MERCADO PAGO SDK (V1.5.1) ---');
        console.log('Payload Body:', JSON.stringify({ ...payload, token: 'REDACTED' }, null, 2));

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
        const { data, type } = req.body;
        let paymentId = req.query.id || req.query['data.id'] || data?.id;

        if (!paymentId && type === 'payment') {
            paymentId = req.body.data?.id;
        }

        if (paymentId) {
            try {
                const result = await payment.get({ id: String(paymentId) });
                const externalReference = result.external_reference;

                if (externalReference) {
                    const transaction = await prisma.transaction.findUnique({
                        where: { id: externalReference }
                    });

                    if (transaction) {
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
