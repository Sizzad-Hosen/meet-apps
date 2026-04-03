import jwt, { Secret, JwtPayload, SignOptions } from "jsonwebtoken";

export const generateToken = (payload: any, secret: string, expiresIn: string) => {

 const options: SignOptions = {
  expiresIn: '30d' as SignOptions['expiresIn'],
};
return jwt.sign(payload, secret, options);

};

interface IJwtPayload extends JwtPayload {
  email: string;
  role: string;
}
export const verifyToken = async (token: string, secret: Secret): Promise<IJwtPayload> => {

    const decoded = jwt.verify(token, secret) as IJwtPayload;

    return decoded;
  

};
