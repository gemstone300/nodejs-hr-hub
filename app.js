import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import UsersRouter from './routers/users.router.js'
import DocumentsRouter from './routers/documents.router.js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = 3033

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
    return res.status(200).send('Hello Token!')
})

/** Access Token 및 Refresh Token 생성부 */
const tokenStorages = {}
app.post('/tokens', async (req, res) => {
    const { id } = req.body

    const accessToken = createAccessToken(id)
    const refreshToken = createRefreshToken(id)

    tokenStorages[refreshToken] = {
        id: id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    }

    console.log(tokenStorages)
    res.cookie('accessToken', accessToken)
    res.cookie('refreshToken', refreshToken)

    return res
        .status(200)
        .json({ message: 'Token이 정상적으로 발급 되었습니다' })
})

app.get('/tokens/validate', async (req, res) => {
    const { accessToken } = req.cookies

    if (!accessToken)
        return res
            .status(400)
            .json({ errorMessage: 'Access Token이 준비되지 않았습니다' })

    const payload = validateToken(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET_KEY
    )
    if (!payload) {
        return res
            .status(401)
            .json({ errorMessage: 'Access Token이 비정상입니다.' })
    }
    const { id } = payload
    return res.status(200).json({
        message: `${id}의 payload를 가진 Token이 정상 인증 되었습니다.`,
    })
})

app.post('/tokens/refresh', async (req, res) => {
    const { refreshToken } = req.cookies

    if (!refreshToken) {
        return res
            .status(400)
            .json({ errorMessage: 'Refresh Token이 존재하지 않습니다.' })
    }

    const payload = validateToken(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET_KEY
    )
    if (!payload) {
        return res
            .status(401)
            .json({ errorMessage: 'Refresh Token이 정상적이지 않습니다.' })
    }
    const userInfo = tokenStorages[refreshToken]
    if (!userInfo) {
        return res.status(419).json({
            errorMessage: 'Refresh Token의 정보가 서버에 존재하지 않습니다.',
        })
    }
    const newAccessToken = createAccessToken(userInfo.id)

    res.cookie('accessToken', newAccessToken)
    return res.status(200).json({ message: 'Access Token을 재발급했습니다.' })
})

function validateToken(token, secretKey) {
    try {
        return jwt.verify(token, secretKey)
    } catch (err) {
        return null
    }
}

function createAccessToken(id) {
    return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET_KEY, {
        expiresIn: '12h',
    })
}

function createRefreshToken(id) {
    return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET_KEY, {
        expiresIn: '12h',
    })
}

app.use('/api', [UsersRouter, DocumentsRouter])

app.listen(PORT, () => {
    console.log(PORT, '포트로 서버가 열렸어요!')
})
