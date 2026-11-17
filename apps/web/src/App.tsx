import { useEffect, useState } from 'react';
import { Layout } from './components/Layout.js';
import { ToastProvider } from './components/Toast.js';
import { Batch } from './pages/Batch.js';
import { Dashboard } from './pages/Dashboard.js';
import { Docs } from './pages/Docs.js';
import { Editor } from './pages/Editor.js';
import { Settings } from './pages/Settings.js';
import type { SavedDesign } from './lib/history.js';
import type { View } from './lib/types.js';

const VIEWS: View[] = ['dashboard', 'editor', 'batch', 'docs', 'settings'];

function readView(): View {
  const hash = window.location.hash.replace(/^#\/?/, '') as View;
  return VIEWS.includes(hash) ? hash : 'dashboard';
}

export default function App() {
  const [view, setView] = useState<View>(readView);

  useEffect(() => {
    const onHashChange = () => {
      setView(readView());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next: View) => {
    window.location.hash = `/${next}`;
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const openDesign = (entry: SavedDesign) => {
    sessionStorage.setItem(
      'qr-studio:editor-draft',
      JSON.stringify({ data: entry.data, design: entry.design }),
    );
    navigate('editor');
  };

  return (
    <ToastProvider>
      <Layout view={view} onNavigate={navigate}>
        {view === 'dashboard' && (
          <Dashboard onNavigate={navigate} onOpenDesign={openDesign} />
        )}
        {view === 'editor' && <Editor />}
        {view === 'batch' && <Batch />}
        {view === 'docs' && <Docs />}
        {view === 'settings' && <Settings />}
      </Layout>
    </ToastProvider>
  );
}
