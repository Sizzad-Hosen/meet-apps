import nodemailer from "nodemailer";
import config from "../app/config";
import { logger } from "./logger";

export const sendEmail = async (to: string, html: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, 
      auth: {
        user: config.email, 
        pass: config.app_pass,
      },
    });

    await transporter.sendMail({
      from: `"Sizzad Hosen" <${config.email}>`, 
      to,
      subject: "Please change your password",
      text: "Hello world?",
      html, 
    });

    logger.info("email_sent", { recipient: to });
  } catch (error) {
    logger.error("email_send_failed", {
      recipient: to,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
