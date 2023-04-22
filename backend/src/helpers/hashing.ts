import bcrypt from 'bcrypt';

// Define a default salt value
const DEFAULT_SALT_ROUNDS = 10;

// Hash a password using bcrypt
function hashPassword(password: string, saltRounds = DEFAULT_SALT_ROUNDS): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(saltRounds, (err: any, salt: string) => {
      if (err) {
        reject(err);
      } else {
        bcrypt.hash(password, salt, (err: any, hash: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(hash);
          }
        });
      }
    });
  });
}

// Check if a password matches a hash using bcrypt
function checkPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err: any, result: boolean) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export {
  hashPassword,
  checkPassword,
};
