import React, { useState, useRef } from 'react';
import { Youtube, Upload, CheckCircle2, XCircle, Loader2, Video } from 'lucide-react';

const YouTubeUploader = ({ accessToken, metadata, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setError(null);
    } else if (selectedFile) {
      setError('動画ファイルを選択してください');
    }
  };

  const uploadVideo = async () => {
    if (!file || !accessToken) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const title = `${metadata.date}_${metadata.tournament || '交流戦'}_${metadata.myName || 'Player'} vs ${metadata.opponentTeam || '相手チーム'}(${metadata.opponentName || '相手選手'})`;
    
    const videoMetadata = {
      snippet: {
        title: title,
        description: 'Uploaded from Tactics Shot App',
        tags: ['badminton', 'tactics-shot'],
        categoryId: '17' // Sports
      },
      status: {
        privacyStatus: 'unlisted',
        selfDeclaredMadeForKids: false
      }
    };

    try {
      // 1. Get Resumable Upload URL
      const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': file.size,
          'X-Upload-Content-Type': file.type
        },
        body: JSON.stringify(videoMetadata)
      });

      if (!response.ok) throw new Error('Failed to start upload session');

      const uploadUrl = response.headers.get('Location');

      // 2. Perform the actual upload
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const result = JSON.parse(xhr.responseText);
          setVideoId(result.id);
          setUploading(false);
          onUploadComplete(result.id);
        } else {
          throw new Error('Upload failed');
        }
      };

      xhr.onerror = () => {
        throw new Error('Network error during upload');
      };

      xhr.send(file);

    } catch (err) {
      console.error(err);
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-rose-500/10 rounded-lg">
          <Youtube className="text-rose-500" size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-white italic">YouTubeアップロード</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">動画を紐付けて管理</p>
        </div>
      </div>

      {!videoId ? (
        <div className="space-y-3">
          <div 
            onClick={() => !uploading && fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${isDragging ? 'border-indigo-500 bg-indigo-500/20 scale-[1.02]' : file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 bg-slate-800/20 hover:border-slate-700'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="video/*" 
              className="hidden" 
            />
            {file ? (
              <>
                <Video className="text-indigo-400" size={24} />
                <span className="text-[10px] font-bold text-slate-300 truncate max-w-full px-2">{file.name}</span>
                <span className="text-[8px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
              </>
            ) : (
              <>
                <Upload className="text-slate-600" size={24} />
                <span className="text-[10px] font-bold text-slate-500">動画ファイルを選択</span>
              </>
            )}
          </div>

          {file && !uploading && (
            <button 
              onClick={uploadVideo}
              className="w-full bg-indigo-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              アップロード開始
            </button>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black italic">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>アップロード中...</span>
                </div>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-[10px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              <XCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
          <CheckCircle2 className="text-emerald-400" size={20} />
          <div className="flex-1">
            <span className="text-[10px] font-black text-emerald-400">アップロード完了</span>
            <div className="text-[8px] text-slate-500 font-bold truncate">ID: {videoId}</div>
          </div>
          <a 
            href={`https://youtu.be/${videoId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[8px] font-black text-indigo-400 underline"
          >
            動画を確認
          </a>
        </div>
      )}
    </div>
  );
};

export default YouTubeUploader;
