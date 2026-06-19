import { SHA256 } from 'crypto-js';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { createSession, destroyCurrentSession, getCurrentSession } from './session';

export type Credentials = {
  email: string;
  password: string;
};

export type NewUser = {
  email: string;
  password: string;
  name: string;
  rootDir: string;
  role: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  rootDir: string;
};

export const hashPassword = (string: string): string => {
  return SHA256(string).toString();
};

export const signIn = async (credentials: Credentials): Promise<User> => {
  const user = await prisma.user.findFirst({
    where: {
      email: credentials.email,
      password: hashPassword(credentials.password),
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      password: false,
      rootDir: true,
      role: true,
    },
  });

  if (user) {
    await createSession(user);
    return user;
  }

  throw new Error('Invalid credentials');
};

export const createUser = async (user: NewUser) => {
  const { password } = user;

  if (password.length < 6) {
    throw new Error('password length should be more than 6 characters');
  }

  try {
    const newUser = await prisma.user.create({
      data: { ...user, password: hashPassword(password) },
    });

    await createSession(newUser);

    return newUser;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      throw new Error(e.message);
    }

    throw e;
  }
};

export { createSession, destroyCurrentSession, getCurrentSession };
