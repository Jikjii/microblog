import { randomUUID } from 'crypto'
import { Request, Response, Router } from 'express'
import { dbCollection } from '../../database'
import { LoggedInUser, validateAccessToken } from './Auth'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
    const result = await dbCollection.find({}).toArray();

    return res.json({
        status: 'ok',
        result,
    })
})

router.post('/', validateAccessToken, async (req: Request & { user: LoggedInUser }, res: Response) => {
    const { body, user } = req;

    const result = await dbCollection.insertOne({
        ...body,
        id: randomUUID(),
        user,

    })
    return res.json({
        status: 'ok',
        result,
    })
})


router.post('/:id/comment', validateAccessToken, (req: Request, res: Response) => {})

export { router as PostRoutes };