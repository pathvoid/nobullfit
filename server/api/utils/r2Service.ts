import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import type { Pool } from "pg";

// Initialize S3 client for Cloudflare R2
const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ""
    }
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "nobullfit-cdn";
const RECIPES_DIR = "recipes";

// Generate a random filename to avoid duplicates
function generateRandomFilename(originalFilename: string): string {
    const ext = originalFilename.split(".").pop() || "jpg";
    const randomString = randomBytes(16).toString("hex");
    const timestamp = Date.now();
    return `${timestamp}-${randomString}.${ext}`;
}

// Upload image to R2
export async function uploadRecipeImage(file: Buffer, originalFilename: string, contentType: string): Promise<string> {
    try {
        const filename = generateRandomFilename(originalFilename);
        const key = `${RECIPES_DIR}/${filename}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: contentType
        });

        await r2Client.send(command);

        return filename;
    } catch (error) {
        console.error("Error uploading image to R2:", error);
        throw new Error("Failed to upload image");
    }
}

// Delete image from R2 (only if not used by other recipes)
export async function deleteRecipeImageIfUnused(filename: string, excludeRecipeId: number | null, pool: Pool): Promise<void> {
    try {
        if (!filename) {
            return;
        }

        // Check if any other recipes are using this image
        const checkResult = await pool.query(
            "SELECT COUNT(*) as count FROM recipes WHERE image_filename = $1 AND id != $2",
            [filename, excludeRecipeId]
        );

        const otherRecipesUsingImage = parseInt(checkResult.rows[0].count, 10) > 0;

        // Only delete if no other recipes are using it
        if (!otherRecipesUsingImage) {
            const key = `${RECIPES_DIR}/${filename}`;

            const command = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key
            });

            await r2Client.send(command);
        }
    } catch (error) {
        // Log error but don't throw - we don't want to fail the recipe update if image deletion fails
        console.error("Error deleting image from R2:", error);
    }
}

// Get the public URL for a recipe image
export function getRecipeImageUrl(filename: string | null | undefined): string | null {
    if (!filename) {
        return null;
    }
    return `https://cdn.nobull.fit/${RECIPES_DIR}/${filename}`;
}
