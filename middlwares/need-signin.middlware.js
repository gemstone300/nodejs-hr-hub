import jwt from 'jsonwebtoken'
import { prisma } from '../models/index.js'

export default async function (req, res, next) {
    try {
        const { authorization } = req.cookies
        if (!authorization)
            throw new Error('요청한 사용자와 토큰이 존재하지 않습니다.')

        const [tokenType, token] = authorization.split(' ')
        if (tokenType !== 'Bearer')
            throw new Error('토큰 타입이 Bearer 형식이 아닙니다')

        const decodedToken = jwt.verify(token, 'custom-secret-key')
        const userId = decodedToken.userId

        const user = await prisma.users.findFirst({
            where: { userId: +userId },
        })
        if (!user) throw new Error('토큰 사용자가 존재하지 않습니다.')

        req.user = user
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError')
            return res
                .status(401)
                .json({ message: '토큰의 유효기간이 만료되었습니다.' })
        if (error.name === 'JsonWebTokenError') {
            return res
                .status(401)
                .json({ message: '토큰의 정상여부 검증에 실패하였습니다.' })
        }

        return res.status(400).json({ message: error.message })
    }
}
