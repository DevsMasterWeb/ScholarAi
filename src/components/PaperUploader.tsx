import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth, db } from '../context/AuthContext';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const PaperUploader: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [paperText, setPaperText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [quota, setQuota] = useState<{ count: number, limit: number, remaining: number } | null>(null);
  const { user } = useAuth();

  const fetchQuota = useCallback(async () => {
    if (!user) return;
    try {
      const quotaSnap = await getDoc(doc(db, 'userQuotas', user.uid));
      const today = new Date().toISOString().split('T')[0];
      let count = 0;
      if (quotaSnap.exists()) {
        const data = quotaSnap.data();
        if (data.date === today) count = data.count || 0;
      }
      setQuota({ count, limit: 3, remaining: Math.max(0, 3 - count) });
    } catch (e) {
      console.error('Failed to fetch quota', e);
    }
  }, [user]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !user) return;

    if (quota && quota.remaining <= 0) {
      alert('Daily limit reached. Please try again tomorrow.');
      return;
    }

    setUploading(true);
    setFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      
      const text = data.text;
      
      const docRef = await addDoc(collection(db, 'papers'), {
        userId: user.uid,
        title: file.name,
        text,
        createdAt: serverTimestamp()
      });
      
      setPaperText(text);
      setPaperId(docRef.id);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [user, quota]);

  const generateReview = async () => {
    if (!paperId || !paperText || !user) return;
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: paperText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      
      const analysis = data.analysis;
      setResult(data);

      await updateDoc(doc(db, 'papers', paperId), {
        title: analysis.documentTitle || fileName || 'Untitled Research',
        aiSummary: analysis.summary,
        relevanceScore: analysis.relevanceScore,
        citationApa: analysis.citationApa,
        citationMla: analysis.citationMla,
        bibliography: analysis.bibliography
      });

      // Index to Pinecone Global RAG
      try {
        await fetch('/api/index-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: paperText,
            documentId: paperId,
            userId: user.uid,
            title: analysis.documentTitle || fileName || 'Untitled Research'
          })
        });
      } catch (err) {
        console.error("Failed to index for RAG", err);
      }

      const today = new Date().toISOString().split('T')[0];
      await setDoc(doc(db, 'userQuotas', user.uid), { date: today, count: (quota?.count || 0) + 1 }, { merge: true });

      fetchQuota(); // update quota after successful generation
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert('Error: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: (quota?.remaining ?? 1) <= 0 || uploading || analyzing
  } as any);

  return (
    <div className="space-y-4">
      {quota && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
          <p className="text-sm text-blue-800 font-medium tracking-tight">Today's Usage</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 bg-white text-blue-600 rounded-full shadow-sm">
              {quota.remaining} reviews remaining
            </span>
          </div>
        </div>
      )}

      {quota && quota.remaining <= 0 && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex flex-col gap-1 items-center justify-center text-center">
          <strong>Daily Limit Reached</strong>
          <span>You have generated {quota.limit} out of {quota.limit} reviews today. The limit will magically refresh tomorrow!</span>
        </div>
      )}

      {(!quota || quota.remaining > 0) && !paperId && (
        <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${isDragActive ? 'border-brand bg-secondary' : 'border-slate-300 hover:border-brand'}`}>
          <input {...getInputProps()} />
          {uploading ? <p className="text-sm text-slate-600 animate-pulse">Uploading...</p> : <p className="text-sm text-slate-600 font-medium">{isDragActive ? 'Drop PDF here' : 'Click or drop a PDF to upload'}</p>}
        </div>
      )}

      {paperId && !result && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Uploaded: <span className="text-brand">{fileName}</span></p>
          <button onClick={generateReview} disabled={analyzing || (quota?.remaining ?? 1) <= 0} className="w-full bg-brand disabled:opacity-50 text-white py-3 rounded-xl font-medium shadow-sm hover:shadow transition-shadow">
            {analyzing ? 'Generating Literature Review...' : 'Generate Literature Review'}
          </button>
        </div>
      )}
      
      {result && result.analysis && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 mb-8">
          <h3 className="font-serif text-xl font-bold border-b pb-2">Literature Review</h3>
          <div>
            <h4 className="font-semibold text-sm text-slate-700">Summary</h4>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.analysis.summary}</div>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-700">Citations</h4>
            <p className="text-xs text-slate-500">APA: {result.analysis.citationApa}</p>
            <p className="text-xs text-slate-500">MLA: {result.analysis.citationMla}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-700">Bibliography</h4>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{result.analysis.bibliography}</p>
          </div>
          <button onClick={() => { setPaperId(null); setResult(null); }} className="w-full mt-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200">
            Review another paper
          </button>
        </div>
      )}
    </div>
  );
};

