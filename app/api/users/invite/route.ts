import { NextResponse, type NextRequest } from 'next/server';
import { auth, firestore } from 'firebase-admin';
import { initAdmin, adminDb } from '../../../../firebase/admin';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

async function sendWelcomeEmail(email: string, actionLink: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'You have been invited to the KJ Eruv Admin Portal',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4A5568;">Welcome!</h2>
        <p>You have been invited to be an editor for the Kiryas Joel Eruv management portal.</p>
        <p>To get started, please click the link below to create your password and log in:</p>
        <a
          href="${actionLink}"
          style="display: inline-block; background-color: #4C51BF; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;"
        >
          Set Your Password
        </a>
        <p style="margin-top: 20px; font-size: 0.9em; color: #718096;">
          If you did not expect this invitation, please disregard this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}


export async function POST(request: NextRequest) {
  await initAdmin();

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists
    const userExists = await adminDb.collection('users').where('email', '==', email).get().then(snap => !snap.empty);
    if (userExists) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    // 1. Create the user in Firebase Auth
    const userRecord = await auth().createUser({ email });

    // 2. Create the user document in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      role: 'editor',
      status: 'pending', // User is pending until they set a password
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    // 3. Generate the password reset link (which acts as a "set password" link)
    const actionLink = await auth().generatePasswordResetLink(email);

    // 4. Send the welcome email with the link
    await sendWelcomeEmail(email, actionLink);

    return NextResponse.json({ success: true, message: `An invitation email has been sent to ${email}.` }, { status: 201 });

  } catch (error: unknown) {
    console.error("Invite user error:", error);
    // Type guard for Firebase-specific errors
   if (typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as {code: unknown}).code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'A user with this email already exists in Firebase Authentication.' }, { status: 409 });
    }
    // General error message for other cases
    return NextResponse.json({ error: 'An internal server error occurred while sending the invitation.' }, { status: 500 });
  }
}
