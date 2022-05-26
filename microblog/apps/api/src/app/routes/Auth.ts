import axios from 'axios';
import { Router, Request, Response, NextFunction } from 'express';
import { environment } from '../../environments/environment';
import * as jwt from 'jsonwebtoken';
const router = Router()

router.get('/github/authorize', async (req: Request, res: Response) => {
    // getting some data back 
    const { query } = req
    const { code } = query

    // basically we recive data and then need to send a request back to github
    // to comfirm the credentials

    const githubAuthResult = await axios.post(
        `https://github.com/login/oauth/access_token?client_id=${environment.clientId}&client_secret=${environment.clientSecret}&code=${code}`,
        null,
        { headers: { Accept: 'application/json'} }
    );

    if(!githubAuthResult || !githubAuthResult.data.access_token) {
        return res.status(400).json({
            status: 'error',
            message: 'Could not identify user with Github', 
        });
    }
    const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
            Authorization: `token ${githubAuthResult.data.access_token}`,
            Accept: 'application/json'
        }
    })
    // retrieve jwt payload

    const { data } = userResponse;
    const { id, login, avatar_url } = data;

    const payload = { id, login, avatar_url };
    
    const token = generateToken(payload);

    setCookieOnResponse(`accessToken`, token, res)

    return res.redirect(environment.appUrl)
    

});

const generateToken = (payload: any) =>
    jwt.sign(payload, environment.appSecret)

const cookieSettings = {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: environment.production,
}

const setCookieOnResponse = (
    cookieName: string,
    cookieValue: string,
    response: Response
    ) => {
    response.cookie(cookieName, cookieValue, cookieSettings)
}

export interface LoggedInUser {
    id: string;
    login: string;
    avatar_url: string;
}

export const validateAccessToken = (req: Request & { user: LoggedInUser}, res: Response, next: NextFunction) => {
    const accessToken = req.headers?.authorization?.split('Bearer ')[1];

    if (!accessToken) {
        return res.status(401).json({
            status: 'Bad Request',
            message: 'No access token provided',
        })
    }

    let decoded;
    try {
        decoded = jwt.verify(accessToken, environment.appSecret)
    } catch (err) {}

    if (!decoded) {
        return res.status(401).json({
            status: 'Bad Request',
            message: 'Could not verify access token',
        })
    }

    const { id, login, avatar_url } = decoded

    req.user = { id, login, avatar_url };
    next();
}

export { router as AuthRoutes }

// created oauth token so that when the user clicks accept to login to the application
// via github --- we will first extractt the code from the query parameters that github 
// has passed back to us and then make a secret call to github to verify the credentials
// if that code is ran back as true we grab the users details from the api req then generate
// an access token and set it on the response as a cookie and redirect the user to the app