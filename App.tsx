
import React, { useState, useEffect } from 'react';
import { AppTab } from './types';
import { generateECCKeyPair, encryptFile, decryptFile } from './cryptoUtils';
import { getSecurityAdvise } from './services/geminiService';

// --- 图标组件 ---
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
const OfflineIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>
);

// --- 基础组件 ---
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
        <span className="text-xs text-slate-500">支持拖拽或点击上传</span>
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

// --- 主程序 ---
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ENCRYPT);
  const [status, setStatus] = useState<{ msg: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [aiAdvise, setAiAdvise] = useState<string>('离线加解密环境已就绪');

  const [encryptFileObj, setEncryptFileObj] = useState<File | null>(null);
  const [generatedPrivKey, setGeneratedPrivKey] = useState<string | null>(null);
  const [decryptFileObj, setDecryptFileObj] = useState<File | null>(null);
  const [privateKeyInput, setPrivateKeyInput] = useState('');

  useEffect(() => {
    getSecurityAdvise('本地加密的优势').then(setAiAdvise);
  }, []);

  const handleEncrypt = async () => {
    if (!encryptFileObj) return setStatus({ msg: '请先选择文件', type: 'error' });
    try {
      setStatus({ msg: '正在本地生成密钥并加密...', type: 'info' });
      const keyPair = await generateECCKeyPair();
      const encryptedBlob = await encryptFile(encryptFileObj, keyPair.publicKey);
      setGeneratedPrivKey(keyPair.privateKey);
      
      const url = URL.createObjectURL(encryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${encryptFileObj.name}.enc`;
      a.click();
      
      setStatus({ msg: '加密成功！请务必保存私钥', type: 'success' });
      getSecurityAdvise('如何妥善保管私钥').then(setAiAdvise);
    } catch (err) {
      setStatus({ msg: '本地加密失败，请重试', type: 'error' });
    }
  };

  const handleDecrypt = async () => {
    if (!decryptFileObj || !privateKeyInput) return setStatus({ msg: '请提供文件和私钥', type: 'error' });
    try {
      setStatus({ msg: '正在本地解密...', type: 'info' });
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
      setStatus({ msg: '解密失败，私钥可能不正确', type: 'error' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setStatus({ msg: '密钥已复制', type: 'success' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-screen-xl mx-auto text-slate-200">
      {/* 头部 */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-indigo-500/30 shadow-xl text-white">
            <ShieldIcon />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
               <h1 className="text-2xl md:text-3xl font-bold gradient-text">CipherGuard ECC</h1>
               <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/30 uppercase tracking-tighter flex items-center gap-1">
                 <OfflineIcon /> 100% 离线运行
               </span>
            </div>
            <p className="text-slate-400 text-xs md:text-sm">基于 Web Crypto 接口的端到端本地加解密工具</p>
          </div>
        </div>

        <nav className="flex w-full md:w-72 gap-1 bg-slate-900/80 p-1 rounded-2xl glass">
          <TabButton active={activeTab === AppTab.ENCRYPT} onClick={() => setActiveTab(AppTab.ENCRYPT)} icon={<LockIcon />} label="加密" />
          <TabButton active={activeTab === AppTab.DECRYPT} onClick={() => setActiveTab(AppTab.DECRYPT)} icon={<UnlockIcon />} label="解密" />
        </nav>
      </header>

      {/* 主体 */}
      <main className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
        <div className="flex-1 glass rounded-[2.5rem] p-6 md:p-10 relative flex flex-col min-h-[400px]">
          {status && (
            <div className={`absolute top-0 left-0 right-0 p-3 text-center text-sm font-medium z-20 ${
              status.type === 'error' ? 'bg-red-500/20 text-red-400 border-b border-red-500/30' : 
              status.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/30' : 
              'bg-indigo-500/20 text-indigo-400 border-b border-indigo-500/30'
            }`}>
              {status.msg}
              <button onClick={() => setStatus(null)} className="ml-4 opacity-50">✕</button>
            </div>
          )}

          {activeTab === AppTab.ENCRYPT ? (
            <div className="space-y-6 flex-1 flex flex-col animate-in fade-in duration-300">
              <h2 className="text-xl font-bold flex items-center gap-2"><LockIcon /> 本地安全加密</h2>
              {!generatedPrivKey ? (
                <>
                  <FileDrop onFile={setEncryptFileObj} label={encryptFileObj ? encryptFileObj.name : "选择要加密的文件"} />
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      系统将生成一个唯一的 <strong>P-256 ECC</strong> 会话密钥对。公钥用于封锁文件，私钥将在加密后提供给您，请务必妥善保存。
                    </p>
                  </div>
                  <button onClick={handleEncrypt} disabled={!encryptFileObj} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl font-bold text-lg transition-all mt-auto shadow-lg shadow-indigo-600/20 text-white">
                    开始加密
                  </button>
                </>
              ) : (
                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="bg-emerald-500/10 border border-emerald-400/20 p-6 rounded-[2rem]">
                    <div className="flex items-center gap-3 mb-3 text-emerald-400 font-bold text-lg">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      加密已完成！
                    </div>
                    <p className="text-sm text-slate-300 mb-6">文件已下载。<strong>注意：</strong>我们不存储您的私钥，请立即复制并保存到安全的地方。</p>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">您的离线私钥</label>
                      <div className="relative group">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 font-mono text-xs break-all text-red-300 min-h-[100px] overflow-y-auto max-h-40 leading-relaxed">
                          {generatedPrivKey}
                        </div>
                        <button onClick={() => copyToClipboard(generatedPrivKey)} className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors text-white">
                          <ClipboardIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setGeneratedPrivKey(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition-all">新文件</button>
                    <button onClick={() => { setActiveTab(AppTab.DECRYPT); setPrivateKeyInput(generatedPrivKey); }} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all text-white">去解密</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col animate-in fade-in duration-300">
              <h2 className="text-xl font-bold flex items-center gap-2"><UnlockIcon /> 离线安全解密</h2>
              <FileDrop onFile={setDecryptFileObj} label={decryptFileObj ? decryptFileObj.name : "选择 .enc 加密文件"} />
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-400">输入解密私钥</label>
                <textarea
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="在此粘贴加密时提供的私钥..."
                  className="w-full flex-1 min-h-[150px] bg-slate-950/50 border border-slate-700 rounded-2xl p-4 text-xs mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none leading-relaxed text-slate-200"
                />
              </div>
              <button onClick={handleDecrypt} disabled={!decryptFileObj || !privateKeyInput} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl font-bold text-lg transition-all mt-auto shadow-lg shadow-emerald-600/20 text-white">
                立即解密
              </button>
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <aside className="w-full lg:w-80 flex flex-col gap-4">
          <div className="glass rounded-[2rem] p-6 border-l-4 border-indigo-500">
            <h3 className="font-bold text-indigo-400 mb-2 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
              安全动态建议
            </h3>
            <p className="text-xs text-slate-300 italic leading-relaxed">"{aiAdvise}"</p>
            <p className="text-[9px] text-slate-600 mt-3">* 建议可能需要联网获取，加解密逻辑始终在本地运行。</p>
          </div>

          <div className="glass rounded-[2rem] p-6 bg-slate-900/40">
            <h3 className="font-bold text-slate-200 mb-4 text-sm">技术指标</h3>
            <ul className="space-y-4 text-[11px] text-slate-500">
              <li className="flex gap-3">
                <span className="w-5 h-5 shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center text-emerald-400 font-bold italic">EC</span>
                <p><span className="text-slate-200 font-semibold">P-256 (NIST):</span> 提供等同于 RSA-3072 的安全强度。</p>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center text-emerald-400 font-bold italic">AES</span>
                <p><span className="text-slate-200 font-semibold">GCM 模式:</span> 确保文件机密性的同时提供防篡改验证。</p>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded flex items-center justify-center text-emerald-400 font-bold italic">PWA</span>
                <p><span className="text-slate-200 font-semibold">可离线安装:</span> 安装到手机后，断开网络仍可正常运行。</p>
              </li>
            </ul>
          </div>
        </aside>
      </main>

      <footer className="mt-8 text-slate-600 text-[10px] text-center max-w-2xl">
        <p>&copy; 2024 CipherGuard ECC. 100% 本地运算，零服务端交互。</p>
        <p className="mt-1 opacity-60">基于现代浏览器加密标准。一旦关闭标签页，内存中的临时密钥将立即销毁。</p>
      </footer>
    </div>
  );
};

export default App;
