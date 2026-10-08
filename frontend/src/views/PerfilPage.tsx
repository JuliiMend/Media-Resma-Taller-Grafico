import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, LockKeyhole, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useProfile } from "@/auth/useProfile";
import { Avatar } from "@/components/Avatar";
import { Badge, Button, ErrorBanner, Field, Input, LoadingState, PageHeader } from "@/components/ui";
import { MAX_PHOTO_BYTES, resizeImage } from "@/lib/profile-photo";
import type { Usuario } from "@/types";

export function PerfilPage() {
  const { user, updateUser } = useAuth();
  const { profile, error, isLoading, mutate } = useProfile();
  const [nombre, setNombre] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre);
      setFotoPerfil(profile.fotoPerfil ?? null);
    }
  }, [profile?.id, profile?.nombre, profile?.fotoPerfil]);

  if (!user) return null;
  const userId = user.id;
  if (isLoading && !profile) return <LoadingState />;
  if (error && !profile) return <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />;

  const photoChanged = fotoPerfil !== (profile?.fotoPerfil ?? null);
  const nameChanged = nombre.trim() !== (profile?.nombre ?? "");
  const passwordChanged = Boolean(password);

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("Elegí un archivo de imagen");
    if (file.size > MAX_PHOTO_BYTES) return setPhotoError("La imagen no puede pesar más de 8 MB");
    try {
      setPhotoError(null);
      setFotoPerfil(await resizeImage(file));
    } catch (err) {
      setPhotoError(getErrorMessage(err));
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!nombre.trim()) return setFormError("El nombre es obligatorio");
    if (passwordChanged && password.length < 6) {
      return setFormError("La contraseña debe tener al menos 6 caracteres");
    }
    const body: Record<string, string | null> = {};
    if (nameChanged) body.nombre = nombre.trim();
    if (photoChanged) body.fotoPerfil = fotoPerfil;
    if (passwordChanged) body.password = password;
    if (!Object.keys(body).length) return setNotice("No hay cambios para guardar.");
    setSaving(true);
    try {
      const { data } = await api.patch<Usuario>(`/usuarios/${userId}`, body);
      updateUser({ nombre: data.nombre, email: data.email, fotoPerfil: data.fotoPerfil ?? fotoPerfil });
      await mutate(data);
      setPassword("");
      setNotice("Perfil actualizado correctamente.");
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Mi perfil" description="Actualizá tus datos, foto y contraseña." />
      {notice && <div role="status" className="mb-4 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">{notice}</div>}
      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-6 text-center">
          <Avatar name={nombre || profile?.nombre} src={fotoPerfil} className="size-32 text-3xl" />
          <div><p className="text-lg font-semibold">{nombre || profile?.nombre}</p><p className="text-sm text-muted">{profile?.email}</p><Badge tone="success">Activo</Badge></div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handlePhoto} aria-label="Elegir foto de perfil" />
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><Camera className="size-4" /> Cambiar foto</Button>{fotoPerfil && <Button type="button" variant="ghost" onClick={() => setFotoPerfil(null)}><Trash2 className="size-4" /> Quitar</Button>}</div>
          {photoError && <ErrorBanner message={photoError} />}
        </section>
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-surface p-6"><h2 className="mb-4 font-bold">Datos personales</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre" htmlFor="perfil-nombre"><Input id="perfil-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" /></Field><Field label="Email (solo lectura)" htmlFor="perfil-email"><Input id="perfil-email" value={profile?.email ?? ""} readOnly disabled /></Field></div></section>
          <section className="rounded-2xl border border-line bg-surface p-6"><h2 className="mb-4 flex items-center gap-2 font-bold"><LockKeyhole className="size-4" /> Cambiar contraseña</h2><Field label="Nueva contraseña" htmlFor="password-nueva" hint="Mínimo 6 caracteres"><Input id="password-nueva" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field></section>
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end"><Button type="submit" loading={saving}>Guardar cambios</Button></div>
        </div>
      </form>
    </div>
  );
}
