import { v4 as uuidv4 } from "uuid";
import { checkPassword, hashPassword } from "..//helpers/hashing";
import { DatabaseHelper } from "../helpers/database";

export default class UsersService {
  private db;

  constructor() {
    this.db = new DatabaseHelper();
  }

  public async getUsers() {
    try {
      const sql = "SELECT `email`, `username` FROM `users`";
      const queryResult = await this.db.query(sql);
      return queryResult;
    } catch (e: any) {
      return {
        status: 500,
        data: {
          error: e,
        },
      };
    }
  }

  public async getSession(session: string) {
    try {
      const sql =
        "SELECT `id`, `username`, `elo` FROM `users` WHERE `session` = ? LIMIT 1";
      const queryResult: any = await this.db.query(sql, [session]);
      const { id, username, elo } = queryResult[0];
      return { userId: id, username, elo };
    } catch (e: any) {
      return {
        status: 500,
        data: {
          error: e,
        },
      };
    }
  }

  public async register(email: string, username: string, password: string) {
    let error = null;

    if(!this.usernameValid(username)) error = "Username invalid";
    if (await this.usernameExists(username)) error = "Username already exists";
    if(!this.emailValid(email)) error = "Email invalid";
    if (await this.emailExists(email)) error = "Email already exists";
    if (!this.isStrongPassword(password)) error = "Password is not strong enough";

    if(error) {
      return {
        status: 400,
        data: {
          error,
        },
      };
    }

    try {
      const sql =
        "INSERT INTO `users` (email, username, password) VALUES (?, ?, ?)";
      await this.db.query(sql, [
        email,
        username,
        await hashPassword(password),
      ]);

      const token = uuidv4();
      this.db.query(
        "UPDATE `users` SET `session` = ? WHERE `email` = ? LIMIT 1",
        [token, email]
      );

      return {
        status: 200,
        data: { message: "User registered successfully!", token },
      };
    } catch (e: any) {
      return {
        status: 500,
        data: {
          error: e,
        },
      };
    }
  }

  public async login(username: string, password: string) {
    let loginType = "username";
    const usernameExists = await this.usernameExists(username);
    const emailExists = await this.emailExists(username);
    if (!usernameExists && !emailExists) {
      return {
        status: 401,
        data: { error: "Invalid username or password combination" },
      };
    }

    if (emailExists) {
      loginType = "email";
    }

    const sql =
      "SELECT `id`, `password` FROM `users` WHERE `" +
      loginType +
      "` = ? LIMIT 1";
    const queryResult = await this.db.query(sql, [username]);

    const passwordValid = await checkPassword(
      password,
      queryResult[0].password
    );
    if (!passwordValid) {
      return {
        status: 401,
        data: { error: "Invalid username or password combination" },
      };
    }

    const token = uuidv4();
    this.db.query("UPDATE `users` SET `session` = ? WHERE `id` = ? LIMIT 1", [
      token,
      queryResult[0].id,
    ]);
    return {
      status: 200,
      data: { message: "User logged in successfully", token },
    };
  }

  public async usernameExists(username: string): Promise<boolean> {
    try {
      const sql =
        "SELECT COUNT(`id`) as count FROM `users` WHERE `username` = ? LIMIT 1";
      const queryResult = await this.db.query(sql, [username]);
      return queryResult[0].count === 1;
    } catch {
      return false;
    }
  }

  public async emailExists(email: string): Promise<boolean> {
    try {
      const sql =
        "SELECT COUNT(`id`) as count FROM `users` WHERE `email` = ? LIMIT 1";
      const queryResult = await this.db.query(sql, [email]);
      return queryResult[0].count === 1;
    } catch {
      return false;
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

  public usernameValid(username: string) {
    const usernameRegex = /^[a-zA-Z0-9_]{1,30}$/;
    return usernameRegex.test(username);
  }

  public emailValid(email: string) {
    const emailRegex = /^[\w.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  public async updateElo(userId: number, elo: number) {
    // TODO: add this to a tracking table instead of just an update
    const sql = "UPDATE `users` SET `elo` = ? WHERE `id` = ? LIMIT 1";
    await this.db.query(sql, [elo, userId]);
  }
}
