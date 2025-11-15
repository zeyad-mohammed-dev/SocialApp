import { EventEmitter } from 'node:events';
import Mail from 'nodemailer/lib/mailer';
import { sendEmail } from '../email/send.email';
import { EmailTemplate } from '../email/email.template';

export interface IEmail extends Mail.Options  {
otp : string ;
name : string;
}

export const emailEvent = new EventEmitter();

emailEvent.on('confirmEmail', async (data:IEmail ) => {
  try {
    data.subject = 'Confirm_Email';
    data.html = EmailTemplate({
      otp: data.otp,
      name: data.name,
      title: 'Email Confirmation',
    });
    await sendEmail(data);
  } catch (error) {
    console.log('Fail to send email ❌', error);
  }
});

/**
 * export const EmailTemplate = ({
   otp,
   name,
   title,
 */
