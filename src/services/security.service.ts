import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class SecurityService {
  /**
   * Set security questions for a user
   */
  async setSecurityQuestions(userId: string, data: {
    question1: string;
    answer1: string;
    question2: string;
    answer2: string;
    question3: string;
    answer3: string;
  }) {
    // Check if questions already exist
    const existing = await prisma.securityQuestion.findUnique({
      where: { userId }
    });

    if (existing) {
      throw createError('Security questions already set. Use update endpoint to modify them', 409);
    }

    // Hash all answers
    const hashedAnswer1 = await bcrypt.hash(data.answer1.toLowerCase().trim(), 12);
    const hashedAnswer2 = await bcrypt.hash(data.answer2.toLowerCase().trim(), 12);
    const hashedAnswer3 = await bcrypt.hash(data.answer3.toLowerCase().trim(), 12);

    const securityQuestion = await prisma.securityQuestion.create({
      data: {
        userId,
        question1: data.question1.trim(),
        answer1: hashedAnswer1,
        question2: data.question2.trim(),
        answer2: hashedAnswer2,
        question3: data.question3.trim(),
        answer3: hashedAnswer3
      }
    });

    return {
      id: securityQuestion.id,
      question1: securityQuestion.question1,
      question2: securityQuestion.question2,
      question3: securityQuestion.question3,
      createdAt: securityQuestion.createdAt
    };
  }

  /**
   * Update security questions (requires current password verification)
   */
  async updateSecurityQuestions(userId: string, currentPassword: string, data: {
    question1: string;
    answer1: string;
    question2: string;
    answer2: string;
    question3: string;
    answer3: string;
  }) {
    // Verify current password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw createError('Current password is incorrect', 401);
    }

    // Hash all answers
    const hashedAnswer1 = await bcrypt.hash(data.answer1.toLowerCase().trim(), 12);
    const hashedAnswer2 = await bcrypt.hash(data.answer2.toLowerCase().trim(), 12);
    const hashedAnswer3 = await bcrypt.hash(data.answer3.toLowerCase().trim(), 12);

    const securityQuestion = await prisma.securityQuestion.upsert({
      where: { userId },
      create: {
        userId,
        question1: data.question1.trim(),
        answer1: hashedAnswer1,
        question2: data.question2.trim(),
        answer2: hashedAnswer2,
        question3: data.question3.trim(),
        answer3: hashedAnswer3
      },
      update: {
        question1: data.question1.trim(),
        answer1: hashedAnswer1,
        question2: data.question2.trim(),
        answer2: hashedAnswer2,
        question3: data.question3.trim(),
        answer3: hashedAnswer3
      }
    });

    return {
      id: securityQuestion.id,
      question1: securityQuestion.question1,
      question2: securityQuestion.question2,
      question3: securityQuestion.question3,
      updatedAt: securityQuestion.updatedAt
    };
  }

  /**
   * Get security questions (without answers)
   */
  async getSecurityQuestions(userId: string) {
    const securityQuestion = await prisma.securityQuestion.findUnique({
      where: { userId }
    });

    if (!securityQuestion) {
      throw createError('Security questions not set', 404);
    }

    return {
      id: securityQuestion.id,
      question1: securityQuestion.question1,
      question2: securityQuestion.question2,
      question3: securityQuestion.question3,
      createdAt: securityQuestion.createdAt,
      updatedAt: securityQuestion.updatedAt
    };
  }

  /**
   * Verify security question answers
   */
  async verifySecurityQuestions(userId: string, answers: {
    answer1: string;
    answer2: string;
    answer3: string;
  }): Promise<boolean> {
    const securityQuestion = await prisma.securityQuestion.findUnique({
      where: { userId }
    });

    if (!securityQuestion) {
      throw createError('Security questions not set', 404);
    }

    // Verify all three answers
    const answer1Valid = await bcrypt.compare(answers.answer1.toLowerCase().trim(), securityQuestion.answer1);
    const answer2Valid = await bcrypt.compare(answers.answer2.toLowerCase().trim(), securityQuestion.answer2);
    const answer3Valid = await bcrypt.compare(answers.answer3.toLowerCase().trim(), securityQuestion.answer3);

    if (!answer1Valid || !answer2Valid || !answer3Valid) {
      throw createError('One or more security question answers are incorrect', 401);
    }

    return true;
  }
}

