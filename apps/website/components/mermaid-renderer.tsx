'use client';

import mermaid from 'mermaid';
import { useEffect } from 'react';

export function MermaidRenderer() {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        primaryColor: '#ffedd5', // brand warm peach
        primaryTextColor: '#431407', // deep brown/ink
        primaryBorderColor: '#ea580c', // brand orange
        lineColor: '#ea580c', // connector line
        secondaryColor: '#fef3c7',
        tertiaryColor: '#f8fafc',
        mainBkg: '#ffedd5',
        nodeBorder: '#ea580c',
        nodeTextColor: '#431407',
        edgeLabelBackground: '#ffffff',
        clusterBkg: '#fff7ed',
        clusterBorder: '#fed7aa',
        titleColor: '#1c1917',
      },
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        useMaxWidth: true,
        padding: 16,
      },
    });

    const nodes = document.querySelectorAll<HTMLElement>('.mermaid:not([data-processed="true"])');
    if (nodes.length > 0) {
      mermaid
        .run({
          nodes: Array.from(nodes),
        })
        .catch((err) => {
          console.error('Mermaid render error:', err);
        });
    }
  }, []);

  return null;
}
