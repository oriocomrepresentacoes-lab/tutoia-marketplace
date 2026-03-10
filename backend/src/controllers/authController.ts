import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, city } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash,
                phone,
                city
            }
        });

        res.status(201).json({ message: 'Usuário criado com sucesso', user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar o cadastro.' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_picture: user.profile_picture } });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar o login.' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, phone, newPassword } = req.body;

        if (!email || !phone || !newPassword) {
            return res.status(400).json({ error: 'E-mail, telefone e nova senha são obrigatórios.' });
        }

        // Limpar o telefone para comparação (apenas números)
        const cleanPhone = phone.replace(/\D/g, '');

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado com este e-mail.' });
        }

        // Também limpar o telefone do banco para garantir a comparação
        const userPhoneClean = user.phone?.replace(/\D/g, '') || '';

        // Compara os últimos 9 dígitos ou o número completo para evitar erros de DDI (55)
        const phoneMatch = userPhoneClean.endsWith(cleanPhone) || cleanPhone.endsWith(userPhoneClean);

        if (!phoneMatch) {
            return res.status(400).json({ error: 'Os dados informados não coincidem com nossos registros.' });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash }
        });

        res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Erro ao redefinir a senha.' });
    }
};
