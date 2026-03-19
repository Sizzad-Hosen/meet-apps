import jwt, { Secret, JwtPayload, SignOptions } from "jsonwebtoken";

export const generateToken = (payload: any, secret: string, expiresIn: string) => {
 const options: SignOptions = {
  expiresIn: '15m' as SignOptions['expiresIn'],
};
jwt.sign(payload, secret, options);

};

interface IJwtPayload extends JwtPayload {
  email: string;
  role: string;
}
export const verifyToken = async (token: string, secret: Secret): Promise<IJwtPayload> => {


    console.log("VERIFY USING SECRET:", secret);
    console.log("VERIFY TOKEN:", token);

    const decoded = jwt.verify(token, secret) as IJwtPayload;

    console.log("Decoded Token:", decoded);

    return decoded;
  

};
