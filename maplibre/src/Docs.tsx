import { FC, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Docs: FC = () => {
  const [docMdText, setDocMdText] = useState<string>('');

  useEffect(() => {
    fetch('/docs.md').then((res) =>
      res.text().then((res) => setDocMdText(res))
    );
  }, []);

  return <ReactMarkdown children={docMdText} remarkPlugins={[remarkGfm]} />;
};
