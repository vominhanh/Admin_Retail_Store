import { ObjectId } from 'mongodb';
import { models, model, Schema, CallbackWithoutResultAndOptionalError, } from 'mongoose';
import bcrypt from 'bcrypt';

const AccountSchema = new Schema({
  id: { type: ObjectId, },
  created_at: {
    type: Date,
    default: () => Date.now(),
    immutable: true,
  },
  updated_at: {
    default: () => Date.now(),
    type: Date,
  },

  username: {
    type: String,
    required: [true, `Username is required!`],
  },
  password: {
    type: String,
    required: [true, `Password is required!`],
  },
  is_admin: {
    type: Boolean,
    required: [true, `Is Admin is required!`],
  },
});

AccountSchema.pre(`save`,
  async function save(next: CallbackWithoutResultAndOptionalError) {
    if (!this.isModified(`password`))
      return next();

    try {
      const salt = await bcrypt.genSalt(
        process.env.HASH_ROUND ? +process.env.HASH_ROUND : 10
      );
      const hashedPassword = await bcrypt.hash(this.password, salt);

      this.password = hashedPassword;

      return next();
    } catch (error) {
      return next(error as Error);
    }
  }
);

AccountSchema.methods.comparePassword = async function (plainTextPassword: string) {
  console.log('Đang so sánh mật khẩu:');
  console.log('- Mật khẩu nhập vào:', plainTextPassword ? '[được cung cấp]' : '[trống]');
  console.log('- Mật khẩu đã mã hóa:', this.password ? '[có giá trị]' : '[trống]');

  if (!plainTextPassword || !this.password) {
    console.log('Một trong hai mật khẩu bị trống');
    return false;
  }

  try {
    const isPasswordMatch = await bcrypt.compare(plainTextPassword, this.password);
    console.log('Kết quả so sánh:', isPasswordMatch ? 'khớp' : 'không khớp');
    return isPasswordMatch;
  } catch (error) {
    console.error('Lỗi khi so sánh mật khẩu:', error);
    return false;
  }
}

export const AccountModel = models.Account || model(`Account`, AccountSchema);