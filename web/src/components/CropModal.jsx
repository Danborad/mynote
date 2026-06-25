import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../utils/cropImage'
import { useToast } from '../contexts/ToastContext'

export default function CropModal({ isOpen, imageSrc, onClose, onCropComplete }) {
    const { showToast } = useToast()
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
    const [loading, setLoading] = useState(false)

    const onCropChange = (crop) => {
        setCrop(crop)
    }

    const onZoomChange = (zoom) => {
        setZoom(zoom)
    }

    const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleConfirm = async () => {
        setLoading(true)
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
            onCropComplete(croppedImage)
        } catch (e) {
            console.error(e)
            showToast('裁切图片失败', 'error')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-card-dark rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-border-dark flex justify-between items-center bg-surface-light dark:bg-card-dark z-10">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">裁切图片</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <span className="material-icons-outlined text-gray-500">close</span>
                    </button>
                </div>

                {/* Cropper Container */}
                <div className="relative w-full h-80 bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteCallback}
                        onZoomChange={onZoomChange}
                        cropShape="round"
                        showGrid={false}
                    />
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="material-icons-outlined text-gray-400">remove_circle_outline</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => {
                                setZoom(Number(e.target.value))
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
                        />
                        <span className="material-icons-outlined text-gray-400">add_circle_outline</span>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/5 transition-colors font-medium text-sm"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="px-6 py-2.5 bg-primary hover:bg-primary-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-primary/30 transition-all flex items-center gap-2"
                        >
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                            确认并上传
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
