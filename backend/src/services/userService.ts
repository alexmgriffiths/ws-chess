import { v4 as uuidv4 } from 'uuid';
import { checkPassword, hashPassword } from "..//helpers/hashing";
import { getConnection } from "../helpers/database";

export default class UsersService {
    public async getUsers() {
        const db = await getConnection();
        try {
            const sql = "SELECT `email`, `username` FROM `users`";
            const queryResult = await db.query(sql);
            return queryResult;
        } catch(e: any) {
            return {
                status: 500,
                data: {
                    error: e
                }
            }
        } finally {
            db.end();
        }
    }

    public async getSession(session: string) {
        const db = await getConnection();
        try {
            const sql = "SELECT `id`, `username`, `elo` FROM `users` WHERE `session` = ? LIMIT 1";
            const queryResult: any = await db.query(sql, [session]);
            const { id, username, elo} = queryResult[0];
            return { userId: id, username, elo };
        } catch(e: any) {
            return {
                status: 500,
                data: {
                    error: e
                }
            }
        } finally {
            db.end();
        }
    }

    // TODO:
    // * Return session on success
    public async register(email: string, username: string, password: string) {
        const db = await getConnection();

        if(await this.usernameExists(username)) {
            return {
                status: 403, data: {
                    error: "Username already exists"
                }
            }
        }

        if(await this.emailExists(email)) {
            return {
                status: 403, data: {
                    error: "Email already exists"
                }
            }
        }
        
        if(!this.isStrongPassword(password)) {
            return {
                status: 403, data: {
                    message: "Password is not strong enough"
                }
            }
        }

        try {
            const sql = "INSERT INTO `users` (email, username, password) VALUES (?, ?, ?)";
            await db.query(sql, [email, username, await hashPassword(password)]);
            return { status: 200, data: { message: "User registered successfully!" }};
        } catch(e: any) {
            return {
                status: 500,
                data: {
                    error: e
                }
            }
        } finally {
            db.end();
        }
    }

    public async login(username: string, password: string) {
        let loginType = "username";
        const usernameExists = await this.usernameExists(username);
        const emailExists = await this.emailExists(username);
        if(!usernameExists && !emailExists) {
            return { status: 401, data: { error: "Invalid username or password combination" }};
        }

        if(emailExists) {
            loginType = "email";
        }

        const db = await getConnection();
        const sql = "SELECT `id`, `password` FROM `users` WHERE `"+loginType+"` = ? LIMIT 1";
        const queryResult = await db.query(sql, [username]);

        const passwordValid = await checkPassword(password, queryResult[0].password);
        if(!passwordValid) {
            return { status: 401, data: { error: "Invalid username or password combination" }}   
        }

        const token = uuidv4();
        db.query('UPDATE `users` SET `session` = ? WHERE `id` = ? LIMIT 1', [token, queryResult[0].id]);
        return { status: 200, data: { message: "User logged in successfully", token }}

    }

    public async usernameExists(username: string): Promise<boolean> {
        const db = await getConnection();
        try {
            const sql = "SELECT COUNT(`id`) as count FROM `users` WHERE `username` = ? LIMIT 1";
            const queryResult = await db.query(sql, [username]);
            console.log(queryResult);
            return queryResult[0].count === 1;
        } catch {
            return false;
        } finally {
            db.end();
        }
    }

    public async emailExists(email: string): Promise<boolean> {
        const db = await getConnection();
        try {
            const sql = "SELECT COUNT(`id`) as count FROM `users` WHERE `email` = ? LIMIT 1";
            const queryResult = await db.query(sql, [email]);
            return queryResult[0].count === 1;
        } catch {
            return false;
        } finally {
            db.end();
        }
    }

    public isStrongPassword(password: string): boolean {
         // Check if password is at least 8 characters long
        if (password.length < 8) {
            return false;
        }

        // Check if password contains at least one uppercase letter
        if (!/[A-Z]/.test(password)) {
            return false;
        }

        // Check if password contains at least one lowercase letter
        if (!/[a-z]/.test(password)) {
            return false;
        }

        // Check if password contains at least one digit
        if (!/\d/.test(password)) {
            return false;
        }

        // If all checks pass, the password is considered strong
        return true;
    }
}