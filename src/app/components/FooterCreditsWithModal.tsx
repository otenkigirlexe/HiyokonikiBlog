'use client';

import React, { useEffect, useState } from 'react';
import buildInfoData from '../../../content/build-info.json';

export interface BuildInfoData {
  app: string;
  version: string;
  build: string;
  commit: string;
  environment: string;
  buildDate: string;
  test: {
    status: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: string;
  };
  coverage: {
    lines: string;
    functions: string;
    branches: string;
    statements: string;
  };
}

export default function FooterCreditsWithModal({
  initialInfo = buildInfoData,
}: {
  initialInfo?: BuildInfoData;
} = {}) {
  const [tapCount, setTapCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const info: BuildInfoData = initialInfo;
  const isLocal = process.env.NEXT_PUBLIC_IS_LOCAL_BUILD === 'true';
  const envLabel = isLocal ? 'development' : info.environment;
  const buildLabel = isLocal ? 'dev' : info.build;
  const commitLabel = isLocal ? 'dev' : info.commit;

  // モーダル表示中は背面ページのスクロールを完全ロックし、閉じたら解除する
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const handleCopyrightTap = () => {
    if (isOpen) return;
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= 20) {
        setIsOpen(true);
        setCopied(false);
        return 0;
      }
      return next;
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setCopied(false);
    setTapCount(0);
  };

  const handleCopy = async () => {
    const text = [
      info.app,
      `Version: ${info.version}`,
      `Build: ${buildLabel}`,
      `Commit: ${commitLabel}`,
      `Environment: ${envLabel}`,
      `Build Date: ${info.buildDate}`,
      '',
      'Tests',
      `Status: ${info.test.status}`,
      `Total: ${info.test.total}`,
      `Passed: ${info.test.passed}`,
      `Failed: ${info.test.failed}`,
      `Skipped: ${info.test.skipped}`,
      `Success Rate: ${info.test.successRate}`,
      '',
      'Coverage',
      `Lines: ${info.coverage.lines}`,
      `Functions: ${info.coverage.functions}`,
      `Branches: ${info.coverage.branches}`,
      `Statements: ${info.coverage.statements}`,
    ].join('\n');

    let copySucceeded = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copySucceeded = true;
      }
    } catch (_) {
      copySucceeded = false;
    }

    // スマートフォンやローカルIP (http://172.20.x.x 等) で navigator.clipboard が制限される場合のフォールバック
    if (!copySucceeded) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (_) {}
    }

    setCopied(true);
  };

  return (
    <>
      <div className="footer-credits">
        <address
          style={{
            fontStyle: 'normal',
            color: 'var(--text-muted)',
            cursor: 'inherit',
            WebkitTapHighlightColor: 'transparent',
            display: 'inline-block',
          }}
        >
          ver: {info.version} / build:{' '}
          <span
            data-testid="footer-build-trigger"
            onClick={handleCopyrightTap}
            style={{
              cursor: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {buildLabel}
          </span>{' '}
          / &copy; HiyokoNiki All Rights Reserved.
        </address>
      </div>

      {isOpen && (
        <div
          className="env-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="env-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            textAlign: 'left',
            overscrollBehavior: 'contain',
            touchAction: 'none',
          }}
        >
          <div
            className="env-modal-content card-frame"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '82dvh',
               display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              touchAction: 'pan-y',
            }}
          >
            {/* 固定ヘッダー（スクロールしても常に上部に固定） */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                flexShrink: 0,
              }}
            >
              <h2 id="env-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                環境情報
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'コピー完了' : 'コピー'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: 'var(--accent)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>

            {/* スクロール可能なコンテンツボディ */}
            <div
              style={{
                padding: '18px 20px 22px 20px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                flex: 1,
              }}
            >
              {/* ビルド情報 */}
              <section style={{ marginBottom: '18px' }}>
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    borderLeft: '3px solid var(--accent)',
                    paddingLeft: '8px',
                  }}
                >
                  ビルド情報
                </h3>
                <dl
                  style={{
                    margin: 0,
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    rowGap: '6px',
                    columnGap: '10px',
                    fontSize: '0.82rem',
                    background: 'var(--bg-secondary)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>App:</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{info.app}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Version:</dt>
                  <dd style={{ margin: 0 }}>{info.version}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Build:</dt>
                  <dd style={{ margin: 0 }}>{buildLabel}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Commit:</dt>
                  <dd style={{ margin: 0, wordBreak: 'break-all' }}>{commitLabel}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Environment:</dt>
                  <dd style={{ margin: 0 }}>{envLabel}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Build Date:</dt>
                  <dd style={{ margin: 0 }}>{info.buildDate}</dd>
                </dl>
              </section>

              {/* テスト情報 */}
              <section style={{ marginBottom: '18px' }}>
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    borderLeft: '3px solid var(--accent)',
                    paddingLeft: '8px',
                  }}
                >
                  テスト情報
                </h3>
                <dl
                  style={{
                    margin: 0,
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    rowGap: '6px',
                    columnGap: '10px',
                    fontSize: '0.82rem',
                    background: 'var(--bg-secondary)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status:</dt>
                  <dd
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      color: info.test.status === 'PASSED' ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {info.test.status}
                  </dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total:</dt>
                  <dd style={{ margin: 0 }}>{info.test.total}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Passed:</dt>
                  <dd style={{ margin: 0 }}>{info.test.passed}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Failed:</dt>
                  <dd style={{ margin: 0 }}>{info.test.failed}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Skipped:</dt>
                  <dd style={{ margin: 0 }}>{info.test.skipped}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Success Rate:</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{info.test.successRate}</dd>
                </dl>
              </section>

              {/* カバレッジ情報 */}
              <section>
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    borderLeft: '3px solid var(--accent)',
                    paddingLeft: '8px',
                  }}
                >
                  カバレッジ情報
                </h3>
                <dl
                  style={{
                    margin: 0,
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    rowGap: '6px',
                    columnGap: '10px',
                    fontSize: '0.82rem',
                    background: 'var(--bg-secondary)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Lines:</dt>
                  <dd style={{ margin: 0 }}>{info.coverage.lines}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Functions:</dt>
                  <dd style={{ margin: 0 }}>{info.coverage.functions}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Branches:</dt>
                  <dd style={{ margin: 0 }}>{info.coverage.branches}</dd>

                  <dt style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Statements:</dt>
                  <dd style={{ margin: 0 }}>{info.coverage.statements}</dd>
                </dl>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
