import express from 'express'
import { prisma } from '../models/index.js'
import authMiddleware from '../middlwares/need-signin.middlware.js'

const router = express.Router()

/** 이력서 등록 API **/
router.post('/posts', authMiddleware, async (req, res, next) => {
    const { title, content } = req.body
    const { userId } = req.user

    const post = await prisma.posts.create({
        data: {
            userId: +userId,
            title: title,
            content: content,
        },
    })
    return res.status(201).json({ data: post })
})

/** 이력서 삭제 API **/
router.delete('/posts/:postId', authMiddleware, async (req, res, next) => {
    const { postId } = req.params

    const post = await prisma.posts.findFirst({ where: { postId: +postId } })

    if (!post)
        return res
            .status(404)
            .json({ message: '이력서 조회에 실패하였습니다.' })
    await prisma.posts.delete({ where: { postId: +postId } })

    return res.status(200).json({ data: '이력서가 삭제되었습니다.' })
})

/** 이력서 수정 API */
router.put('/posts/:postId', authMiddleware, async (req, res, next) => {
    const { postId } = req.params
    const { title, content, status } = req.body

    const post = await prisma.posts.findUnique({
        where: { postId: +postId },
    })

    if (!post)
        return res.status(404).json({ message: '이력서 조회에 실패하였습니다' })

    await prisma.posts.update({
        data: { title, content, status },
        where: {
            postId: +postId,
        },
    })

    return res.status(200).json({ message: '이력서 변경에 성공하였습니다.' })
})

router.get('/posts', async (req, res, next) => {
    const posts = await prisma.posts.findMany({
        select: {
            postId: true,
            userId: true,
            title: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    })
    return res.status(200).json({ data: posts })
})

// /** 이력서 상세조회 API **/
// router.get('/posts/:postId', async (req, res, next) => {
//     const { postId } = req.params
//     const post = await prisma.posts.findFirst({
//         where: { postId: +postId },
//         select: {
//             postId: true,
//             title: true,
//             content: true,
//             user: {
//                 select: {
//                     name: true,
//                 },
//             },
//             status: true,
//             createdAt: true,
//         },
//     })
//     return res.status(200).json({ data: post })
// })

export default router
