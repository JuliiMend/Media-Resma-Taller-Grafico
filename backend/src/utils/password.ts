import bcrypt from "bcryptjs";

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const compararPassword = (password: string, hash: string) => bcrypt.compare(password, hash);