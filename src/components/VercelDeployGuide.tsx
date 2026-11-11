import React from 'react';
import { X, Globe, GitBranch, CheckCircle2, Copy, ExternalLink, Terminal } from 'lucide-react';

interface VercelDeployGuideProps {
  onClose: () => void;
}

export const VercelDeployGuide: React.FC<VercelDeployGuideProps> = ({ onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const copyConfig = () => {
    navigator.clipboard.writeText(
`// vercel.json (Already included in root!)
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-xl w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <Globe className="w-4 h-4" />
          <span>Deployment Guide</span>
        </div>

        <h2 className="text-2xl font-serif font-bold text-amber-100 mb-2">
          Deploying to Vercel (Multiple Files)
        </h2>
        <p className="text-sm text-slate-300 mb-6">
          Your project is fully configured as a modern Vite + React + Three.js web application with a <code className="text-amber-300">vercel.json</code> ready out-of-the-box.
        </p>

        {/* Steps */}
        <div className="space-y-4 mb-6 text-sm">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-slate-200 mb-1">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-mono">1</span>
              <span>Push Code to GitHub / GitLab / Bitbucket</span>
            </div>
            <p className="text-xs text-slate-400 ml-8 mb-2">
              Commit your code and push it to a new private or public repository:
            </p>
            <div className="ml-8 p-2.5 rounded-xl bg-slate-950 font-mono text-xs text-emerald-300 flex items-center justify-between">
              <code>git add . && git commit -m "Alpine Birthday" && git push</code>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-slate-200 mb-1">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-mono">2</span>
              <span>Import Project on Vercel</span>
            </div>
            <p className="text-xs text-slate-400 ml-8">
              Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-amber-400 underline font-medium">vercel.com/new</a>, select your repository, and click <strong>"Import"</strong>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-slate-200 mb-1">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-mono">3</span>
              <span>Zero Configuration Needed</span>
            </div>
            <p className="text-xs text-slate-400 ml-8 mb-2">
              Vercel automatically detects the Vite framework and runs <code className="text-amber-300">npm run build</code> producing the <code className="text-amber-300">dist/</code> static files.
            </p>
            <div className="ml-8 flex items-center justify-between text-xs text-slate-400 bg-slate-950/70 p-2.5 rounded-xl">
              <span>Framework: <strong>Vite</strong> | Output: <strong>dist</strong></span>
              <button
                onClick={copyConfig}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied vercel.json' : 'Copy Config'}</span>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-sm shadow-lg transition cursor-pointer"
        >
          Got it! Return to Experience
        </button>
      </div>
    </div>
  );
};
