'use client';

import { Pencil } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import { usersApi } from '../../lib/users-api';
import { useAuth } from '../auth/auth-provider';

type ProfileAvatarProps = {
  displayName: string;
  initials: string;
  avatarUrl?: string | null;
};

export const ProfileAvatar = ({
  displayName,
  initials,
  avatarUrl,
}: ProfileAvatarProps) => {
  const { accessToken, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const canEdit = Boolean(accessToken) && !uploading;

  const handlePick = () => {
    if (!canEdit) {
      return;
    }
    fileRef.current?.click();
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !accessToken) {
      return;
    }
    setUploading(true);
    try {
      await usersApi.uploadAvatar(accessToken, file);
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const buttonClasses = `absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full text-xs font-black text-white shadow-cute ${
    canEdit ? 'bg-meow-300 hover:bg-meow-300/90' : 'cursor-not-allowed bg-meow-200'
  }`;

  return (
    <div className="relative">
      <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-meow-200 to-meow-300 text-2xl font-black text-white shadow-cute">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Foto de ${displayName}`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <button
        type="button"
        className={buttonClasses}
        onClick={handlePick}
        aria-label="Editar foto de perfil"
        title={canEdit ? 'Editar foto de perfil' : 'Entre para editar a foto'}
        disabled={!canEdit}
      >
        <Pencil size={12} aria-hidden />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};
