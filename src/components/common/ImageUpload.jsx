import { useState, useRef } from 'react';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import cloudinaryService from '../../services/cloudinary/cloudinaryService';
import { compressImage } from '../../utils/imageCompressor';
import { toast } from 'sonner';

export function ImageUpload({
  images = [],
  onChange,
  maxImages = 5,
  folder = 'tienda_ropa/productos',
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Puedes subir un máximo de ${maxImages} imágenes por producto`);
      return;
    }

    setIsUploading(true);
    try {
      const compressedFiles = await Promise.all(files.map((file) => compressImage(file)));
      const uploadPromises = compressedFiles.map((file) => cloudinaryService.uploadImage(file, folder));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((res) => res.url);
      onChange([...images, ...newUrls]);
      toast.success(`${results.length} imagen(es) procesada(s) y subida(s) correctamente`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir imagen: ' + (error.message || 'Intente nuevamente'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      handleFileSelect({ target: { files } });
    }
  };

  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Fotografías de la Prenda
          </label>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-700">
            Opcional ({images.length}/{maxImages})
          </span>
        </div>
        <span className="text-[11px] text-neutral-500">
          JPG, PNG o WebP
        </span>
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed">
        En computadoras de mostrador no es necesario subir fotos. Si no tienes imágenes, la prenda se identificará automáticamente en todo el sistema por su ficha técnica, tela, color y ubicación en percheros.
      </p>

      {/* Grid of uploaded images */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-1">
        {images.map((imgUrl, index) => (
          <div
            key={index}
            className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100"
          >
            <img
              src={imgUrl}
              alt={`Foto ${index + 1}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-900/80 text-white backdrop-blur-xs">
                Principal
              </span>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${
              isUploading
                ? 'border-neutral-300 bg-neutral-50 cursor-wait'
                : 'border-neutral-300 hover:border-neutral-900 bg-neutral-50/50 hover:bg-neutral-100/50'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-neutral-500 animate-spin mb-1" />
                <span className="text-[10px] text-neutral-500 font-medium">Subiendo...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-neutral-400 mb-1" />
                <span className="text-[11px] font-semibold text-neutral-700">
                  Subir Foto
                </span>
                <span className="text-[9px] text-neutral-500">Click o arrastra</span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
