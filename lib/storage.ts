"use client";

import { createClient } from "@/lib/supabase/client";

export async function uploadAttachment(
  file: File,
  type: "image" | "audio" | "video",
  coupleId: string
): Promise<{ path: string; thumbnailPath?: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = file.name.split(".").pop() || "bin";
  const path = `${coupleId}/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from("attachments").upload(path, file, {
    contentType: file.type,
  });

  if (error) {
    console.error("uploadAttachment error:", error);
    return null;
  }

  let thumbnailPath: string | undefined;
  if (type === "image" && file.type.startsWith("image/")) {
    thumbnailPath = await generateThumbnail(file, path, coupleId, user.id, supabase);
  }

  return { path, thumbnailPath };
}

async function generateThumbnail(
  file: File,
  originalPath: string,
  coupleId: string,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const maxDim = 300;
      const scale = Math.min(maxDim / img.width, maxDim / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(undefined); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.7));
      if (!blob) { resolve(undefined); return; }
      const thumbPath = `${coupleId}/${userId}/thumbs/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("attachments").upload(thumbPath, blob, {
        contentType: "image/jpeg",
      });
      resolve(error ? undefined : thumbPath);
    };
    img.onerror = () => resolve(undefined);
    img.src = URL.createObjectURL(file);
  });
}

export async function getPublicUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  return data?.publicUrl || null;
}
