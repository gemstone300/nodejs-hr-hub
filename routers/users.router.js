import express from 'express'
import { prisma } from '../models/index.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Prisma } from '@prisma/client'
import authMiddleware from '../middlwares/need-signin.middlware.js'

const router = express.Router()

/** 인증기능 - 회원가입  */
router.post('/sign-up', async (req, res, next) => {
    try {
        const { email, password, password_confirm, name } = req.body
        const isExistUser = await prisma.users.findFirst({
            where: {
                email,
            },
        })

        if (isExistUser) {
            return res
                .status(409)
                .json({ message: '이미 존재하는 이메일입니다.' })
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: '비밀번호는 최소 6자 이상입니다.' })
        }
        if (password !== password_confirm) {
            return res.status(400).json({
                message: ' 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const [user, userInfo] = await prisma.$transaction(
            async (tx) => {
                const user = await tx.users.create({
                    data: { email, password: hashedPassword },
                })

                const userInfo = await tx.userInfos.create({
                    data: {
                        userId: user.userId,
                        name,
                    },
                })
                return [user, userInfo]
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            }
        )
        // return res.status(201).json({ message: '회원가입 완료' })
        return res.status(201).json({ data: [userInfo] })
    } catch (err) {
        next(err)
    }
})

/** 인증기능 - 로그인  */
router.post('/sign-in', async (req, res, next) => {
    const { email, password } = req.body
    const user = await prisma.users.findFirst({ where: { email } })

    if (!user)
        return res.status(401).json({ message: '이메일이 존재하지 않습니다.' })
    if (!(await bcrypt.compare(password, user.password)))
        return res
            .status(401)
            .json({ message: '비밀번호가 일치하지 않습니다.' })

    //req.session.userId = user.userId;
    const token = jwt.sign(
        {
            userId: user.userId,
        },
        'custom-secret-key'
    )
    res.cookie('authorization', `Bearer ${token}`)
    return res.status(200).json({ message: '로그인에 성공하였습니다.' })
})

/** 사용자 정보 조회 */
router.get('/users', authMiddleware, async (req, res, next) => {
    const { userId } = req.user

    const user = await prisma.users.findFirst({
        where: { userId: +userId },
        select: {
            userId: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            userInfos: {
                select: {
                    name: true,
                },
            },
        },
    })

    //req.locals.user = user;
    return res.status(200).json({ data: user })
})
export default router
