import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
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
            // Credit card
            let finalToken = token;
            let finalPaymentMethodId = payment_method_id;

            // Detect if token is mock or if we should tokenize from backend (as suggested by user tip)
            const isMockToken = !token || token.startsWith('mock_') || token.length < 20;
            const hasRawData = req.body.cardNumber || req.body.card_data_fallback;

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

                // Final safety check for tokenization data
                if (rawData.card_number && rawData.expiration_month && rawData.expiration_year && rawData.security_code) {
                    // Adjust year if 2 digits
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

                            // Also try to get real brand from token data if it's currently 'master' or 'credit_card'
                            if (tokenData.bin_attributes?.brand?.code) {
                                finalPaymentMethodId = tokenData.bin_attributes.brand.code;
                                console.log('Backend identified Brand:', finalPaymentMethodId);
                            }
                        } else {
                            console.error('Backend Tokenization Failed:', tokenData);
                        }
                    } catch (err) {
                        console.error('Backend Tokenization Error:', err);
                    }
                }

                payload.token = finalToken;
                payload.payment_method_id = finalPaymentMethodId;
                payload.installments = installments || 1;
            }

            const idempotencyKey = `${transaction.id}-${Date.now()}`;

            console.log('--- SENDING TO MERCADO PAGO ---');
            console.log('URL:', MP_API_URL);
            console.log('Idempotency-Key:', idempotencyKey);
            console.log('Payload:', JSON.stringify(payload, null, 2));

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
            console.log('--- MERCADO PAGO RESPONSE ---');
            console.log('Status:', response.status);
            console.log('Data:', JSON.stringify(mpData, null, 2));
            const isResponseOk = response.ok;

            if (!isResponseOk) {
                console.error('--- MERCADO PAGO GATEWAY ERROR ---');
                console.error('Status Code:', response.status);
                console.error('Error Data:', JSON.stringify(mpData, null, 2));
                console.error('--- END ERROR ---');
                return res.status(400).json({
                    error: 'Falha no pagamento no gateway',
                    details: mpData
                });
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
            console.log('--- WEBHOOK RECEIVED ---');
            console.log('Body:', JSON.stringify(req.body, null, 2));
            console.log('Query:', JSON.stringify(req.query, null, 2));

            // Mercado Pago sends notifications in a few formats:
            // 1. Webhooks: { "action": "payment.updated", "data": { "id": "123456" } }
            // 2. IPN: query param id=123456 and topic=payment

            let paymentId = req.query.id || req.query['data.id'] || data?.id;

            if (!paymentId && type === 'payment') {
                paymentId = req.body.data?.id;
            }

            console.log('Resolved Payment ID:', paymentId);

            if (paymentId) {
                // Fetch exact payment status from MP API to avoid spoofing
                const response = await fetch(`${MP_API_URL}/${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
                    }
                });

                if (response.ok) {
                    const mpData: any = await response.json();
                    console.log('MP Payment Data:', JSON.stringify(mpData, null, 2));
                    const externalReference = mpData.external_reference; // Our transaction ID
                    console.log('External Reference (Transaction ID):', externalReference);

                    if (externalReference) {
                        const transaction = await prisma.transaction.findUnique({
                            where: { id: externalReference }
                        });

                        if (transaction) {
                            if (mpData.status === 'approved' && transaction.status !== 'APPROVED') {
                                await prisma.transaction.update({
                                    where: { id: externalReference },
                                    data: {
                                        status: 'APPROVED',
                                        payment_id: String(paymentId),
                                        expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
                                    }
                                });

                                // Real-time update via Socket.io
                                const { io } = require('../index');
                                if (io) {
                                    io.to(transaction.user_id).emit('payment_approved', {
                                        transaction_id: externalReference,
                                        type: transaction.type,
                                        message: transaction.type === 'BANNER'
                                            ? 'Seu pagamento do Banner foi aprovado! Agora você pode criar seu banner.'
                                            : 'Seu pagamento de Mais Imagens foi aprovado! Agora você pode postar anúncios com até 10 fotos.'
                                    });
                                }
                            } else if ((mpData.status === 'rejected' || mpData.status === 'cancelled') && transaction.status === 'PENDING') {
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
