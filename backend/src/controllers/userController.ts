import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/db';
import { AuthRequest } from '../middlewares/auth';

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Não autorizado' });

        const { name, phone, password } = req.body;

        let dataToUpdate: any = {};

        if (name) dataToUpdate.name = name;
        if (phone) dataToUpdate.phone = phone;

        if (password) {
            dataToUpdate.password_hash = await bcrypt.hash(password, 10);
        }

        if (req.file) {
            dataToUpdate.profile_picture = req.file.path; // Cloudinary URL
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: { id: true, name: true, email: true, phone: true, role: true, profile_picture: true }
        });

        res.json({ message: 'Perfil atualizado com sucesso', user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar o perfil.' });
    }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Não autorizado' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, phone: true, role: true, profile_picture: true }
        });

        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar o perfil' });
    }
};
