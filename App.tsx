import React, { useState, useEffect } from 'react';
import { AppTab } from './types';
import { generateECCKeyPair, encryptFile, decryptFile } from './cryptoUtils';
import { getSecurityAdvise } from './services/geminiService';

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);
const UnlockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2z" /></svg>
);
const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);
const ClipboardIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
);

const FileDrop: React.FC<{ onFile: (file: File) => void; label: string }> = ({ onFile, label }) => {
  const [isDrag, setIsDrag] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDrag(false);
    if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
      onDragLeave={() => setIsDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        isDrag ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
      }`}
    >
      <input type="file" ref={inputRef} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="hidden" />
      <div className="flex flex-col items-center gap-3">
        <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
        <span className="text-slate-300 font-medium px-4">{label}</span>
        <span className="text-xs text-slate-500">点击或拖拽上传文件</span>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800/50'
    }`}
  >
    {icon}
    <span className="font-semibold">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ENCRYPT);
  const [status, setStatus] = useState<{ msg: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [aiAdvise, setAiAdvise] = useState<string>('系统已就绪');

  const [encryptFileObj, setEncryptFileObj] = useState<File | null>(null);
  const [generatedPrivKey, setGeneratedPrivKey] = useState<string | null>(null);
  const [decryptFileObj, setDecryptFileObj] = useState<File | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState('');

  useEffect(() => {
    getSecurityAdvise('本地加密').then(setAiAdvise);
  }, []);

  const handleEncrypt = async () => {
    if (!encryptFileObj) return setStatus({ msg: '请先选择文件', type: 'error' });
    try {
      setStatus({ msg: '正在生成密钥并加密...', type: 'info' });
      const keyPair = await generateECCKeyPair();
      const encryptedBlob = await encryptFile(encryptFileObj, keyPair.publicKey);
      setGeneratedPrivKey(keyPair.privateKey);
      
      const url = URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${encryptFileObj.name}.enc`;
      a.click();
      
      setStatus({ msg: '加密成功！请保存私钥。', type: 'success' });
    } catch (err) {
      setStatus({ msg: '加密失败', type: 'error' });
    }
  };

  const handleDecrypt = async () => {
    if (!decryptFileObj || !privateKeyInput) return setStatus({ msg: '请选择文件并输入私钥', type: 'error' });
    try {
      setStatus({ msg: '正在解密...', type: 'info' });
      const data = await decryptFileObj.arrayBuffer();
      const decryptedData = await decryptFile(data, privateKeyInput);
      const originalName = decryptFileObj.name.replace('.enc', '');
      const blob = new Blob([decryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      setStatus({ msg: '解密成功！', type: 'success' });
    } catch (err) {
      setStatus({ msg: '解密失败，请检查私钥。', type: 'error' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setStatus({ msg: '密钥已复制', type: 'success' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-screen-xl mx-auto">
      <header className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">CipherGuard ECC</h1>
            <p className="text-slate-400 text-sm">100% 浏览器本地离线加解密</p>
          </div>
        </div>

        <nav className="flex w-full md:w-72 gap-1 bg-slate-900/80 p-1 rounded-2xl glass">
          <TabButton active={activeTab === AppTab.ENCRYPT} onClick={() => setActiveTab(AppTab.ENCRYPT)} icon={<LockIcon />} label="加密" />
          <TabButton active={activeTab === AppTab.DECRYPT} onClick={() => setActiveTab(AppTab.DECRYPT)} icon={<UnlockIcon />} label="解密" />
        </nav>
      </header>

      <main className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
        <div className="flex-1 glass rounded-3xl p-6 md:p-10 relative flex flex-col min-h-[450px]">
          {status && (
            <div className={`absolute top-0 left-0 right-0 p-3 text-center text-sm font-medium z-20 transition-all ${
              status.type === 'error' ? 'bg-red-500/20 text-red-400' : 
              status.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 
              'bg-indigo-500/20 text-indigo-400'
            }`}>
              {status.msg}
            </div>
          )}

          {activeTab === AppTab.ENCRYPT ? (
            <div className="space-y-6 flex-1 flex flex-col pt-6">
              <h2 className="text-xl font-bold">本地安全加密</h2>
              {!generatedPrivKey ? (
                <>
                  <FileDrop onFile={setEncryptFileObj} label={encryptFileObj ? encryptFileObj.name : "选择文件"} />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    使用 P-256 ECC 和 AES-GCM 算法。密钥在本地生成，绝不上传。
                  </p>
                  <button onClick={handleEncrypt} disabled={!encryptFileObj} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-2xl font-bold mt-auto transition-all">
                    开始加密
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                    加密完成！请立即保存下方私钥：
                  </div>
                  <div className="relative">
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs overflow-auto max-h-40 break-all text-red-300 font-mono">
                      {generatedPrivKey}
                    </pre>
                    <button onClick={() => copyToClipboard(generatedPrivKey)} className="absolute top-2 right-2 p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
                      <ClipboardIcon />
                    </button>
                  </div>
                  <button onClick={() => setGeneratedPrivKey(null)} className="w-full py-3 border border-slate-700 rounded-xl text-sm hover:bg-slate-800">返回</button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col pt-6">
              <h2 className="text-xl font-bold">本地安全解密</h2>
              <FileDrop onFile={setDecryptFileObj} label={decryptFileObj ? decryptFileObj.name : "选择 .enc 加密文件"} />
              <textarea
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="在此粘贴您的解密私钥..."
                className="w-full flex-1 min-h-[120px] bg-slate-950/50 border border-slate-700 rounded-2xl p-4 text-xs font-mono outline-none resize-none focus:border-indigo-500 transition-colors"
              />
              <button onClick={handleDecrypt} disabled={!decryptFileObj || !privateKeyInput} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-2xl font-bold mt-auto transition-all">
                立即解密
              </button>
            </div>
          )}
        </div>

        <aside className="lg:w-80 flex flex-col gap-4">
          <div className="glass rounded-3xl p-6 border-l-4 border-indigo-500">
            <h3 className="text-indigo-400 font-bold text-sm mb-2 uppercase tracking-wider">安全动态提示</h3>
            <p className="text-xs text-slate-300 italic leading-relaxed">"{aiAdvise}"</p>
          </div>
          <div className="glass rounded-3xl p-6 text-[10px] text-slate-500 space-y-4">
            <div>
              <p className="text-slate-400 font-bold mb-1 uppercase">加密技术指标</p>
              <ul className="space-y-1">
                <li>• 曲线: NIST P-256 (ECDH)</li>
                <li>• 模式: AES-256-GCM (带验证加密)</li>
                <li>• 摘要: SHA-256 KDF</li>
              </ul>
            </div>
            <p className="border-t border-slate-800 pt-3">
              注意：CipherGuard 不会在后端存储任何数据。如果您丢失了私钥，您的加密文件将永远无法找回。
            </p>
          </div>
        </aside>
      </main>
      
      <footer className="mt-auto pt-12 pb-6 text-slate-600 text-[10px] text-center max-w-2xl">
        <p>&copy; 2024 CipherGuard ECC. 基于 Web Crypto 标准。100% 本地运算。</p>
      </footer>
    </div>
  );
};

export default App;