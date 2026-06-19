import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { User } from './user';

// Todo: Generate this on start (?) and store in .env file (?) or maybe somewhere in the process
const sessionKeySecret = '94F20455ADC1C4265A987450D5C96EDBC8E551C4E90A232D419AB095827AE214';

export const createSession = async (user: User) => {
  const expires = (24 * 60 * 60) * 7; // 7 days in seconds
  const session = await encrypt({ user, expires });
  const cookieStore = await cookies();

  cookieStore.set('session', session, {
    maxAge: expires,
    httpOnly: true,
  });

  return session;
};

export const getCurrentSession = async () => {
  const cookieStore = await cookies();
  const encryptedSessionData = cookieStore.get('session')?.value;

  if (encryptedSessionData != null) {
    return decrypt(encryptedSessionData);
  }

  return null;
};

export const destroyCurrentSession = async () => {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { expires: new Date(0) });
};

const encrypt = async (payload: any) => {
  const key = new TextEncoder().encode(sessionKeySecret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 week')
    .sign(key);
};

export const decrypt = async (input: string) => {
  const key = new TextEncoder().encode(sessionKeySecret);
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });

  return payload;
};
