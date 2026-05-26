"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createCategorySchema, type CreateCategoryInput } from "@/lib/validations/category";

export async function addParticipant(categoryId: string, data: { name: string; seed?: number; teamName?: string }) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    const participant = await prisma.participant.create({
      data: {
        name: data.name,
        seed: data.seed || null,
        teamName: data.teamName || null,
        categoryId,
      },
    });

    return { success: true, participantId: participant.id };
  } catch (error) {
    console.error("Failed to add participant:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function createCategory(data: CreateCategoryInput) {
  try {
    // 1. Validate input strictly
    const parsedData = createCategorySchema.parse(data);

    // 2. Create the category in the database
    const category = await prisma.category.create({
      data: {
        tournamentId: parsedData.tournamentId,
        name: parsedData.name,
        type: parsedData.type,
        format: parsedData.format,
        poolSize: parsedData.poolSize,
        advanceCount: parsedData.advanceCount,
      },
    });

    // 4. Revalidate the tournament details page
    revalidatePath(`/admin/tournaments/${parsedData.tournamentId}`);

    return { success: true, categoryId: category.id };
  } catch (error) {
    console.error("Failed to create category:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "An unexpected error occurred while creating the category." };
  }
}

export async function deleteCategory(tournamentId: string, categoryId: string) {
  try {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        tournamentId,
      },
    });

    if (!category) {
      return { success: false, error: "Category not found." };
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    revalidatePath(`/admin/tournaments/${tournamentId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { success: false, error: "An unexpected error occurred while deleting the category." };
  }
}

