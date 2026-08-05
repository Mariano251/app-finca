import "dotenv/config";
import crypto from "crypto";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "finca-uploads";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no están configuradas (ver server/.env)");
  }
  return createClient(url, key);
}

/** Uploads a buffer to the public Supabase Storage bucket and returns its public URL. */
export async function subirImagen(buffer: Buffer, nombreOriginal: string, mimetype: string): Promise<string> {
  const supabase = getClient();
  const ext = path.extname(nombreOriginal) || "";
  const filename = `${crypto.randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: mimetype,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/** Deletes a previously uploaded image given its public URL (no-op if the URL isn't from our bucket). */
export async function borrarImagen(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const filename = publicUrl.slice(idx + marker.length);
  if (!filename) return;

  const supabase = getClient();
  await supabase.storage.from(BUCKET).remove([filename]);
}
