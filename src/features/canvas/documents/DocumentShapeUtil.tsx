import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLResizeInfo,
} from '@tldraw/tldraw';
import {
  FileText,
  Code,
  Table,
  FileQuestion,
  Presentation,
  Copy,
  Trash2,
} from 'lucide-react';
import type { IDocumentShape, DocumentShapeProps, DocumentType } from './DocumentBlockTypes';
import { DEFAULT_TEXT_CONTENT } from './DocumentBlockTypes';
import { TextEditorBlock } from './TextEditorBlock';
import { CodeEditorBlock } from './CodeEditorBlock';
import { SpreadsheetBlock } from './SpreadsheetBlock';
import { PdfViewerBlock } from './PdfViewerBlock';
import { SlideshowBlock } from './SlideshowBlock';

const DOC_TYPE_META: Record<
  DocumentType,
  { label: string; icon: any; colorBadge: string; defaultTitle: string }
> = {
  text: {
    label: 'Text Document',
    icon: FileText,
    colorBadge: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30',
    defaultTitle: 'Notes & Ideas',
  },
  code: {
    label: 'Code Editor',
    icon: Code,
    colorBadge: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/30',
    defaultTitle: 'solution.ts',
  },
  sheet: {
    label: 'Spreadsheet',
    icon: Table,
    colorBadge: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/30',
    defaultTitle: 'Financial Model',
  },
  pdf: {
    label: 'PDF Document',
    icon: FileQuestion,
    colorBadge: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/30',
    defaultTitle: 'Document.pdf',
  },
  slides: {
    label: 'Slideshow Deck',
    icon: Presentation,
    colorBadge: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/30',
    defaultTitle: 'Product Pitch Deck',
  },
};

export class DocumentShapeUtil extends BaseBoxShapeUtil<any> {
  static override type = 'document_block' as const;

  static override props: RecordProps<any> = {
    w: T.number,
    h: T.number,
    docType: T.string as any,
    title: T.string,
    content: T.string,
    meta: T.jsonValue as any,
  };

  override getDefaultProps(): DocumentShapeProps {
    return {
      w: 520,
      h: 380,
      docType: 'text',
      title: 'Notes & Ideas',
      content: DEFAULT_TEXT_CONTENT,
      meta: {},
    };
  }

  override getIndicatorPath(shape: IDocumentShape) {
    const path = new Path2D();
    if (typeof path.roundRect === 'function') {
      path.roundRect(0, 0, shape.props.w, shape.props.h, 12);
    } else {
      path.rect(0, 0, shape.props.w, shape.props.h);
    }
    return path;
  }

  override onResize(shape: IDocumentShape, info: TLResizeInfo<any>) {
    const minW = 320;
    const minH = 240;
    const resized = super.onResize(shape, info);
    return {
      ...resized,
      props: {
        ...resized.props,
        w: Math.max(minW, resized.props.w),
        h: Math.max(minH, resized.props.h),
      },
    };
  }

  override component(shape: IDocumentShape) {
    const editor = this.editor;
    const isReadOnly = editor.getInstanceState().isReadonly;
    const docType: DocumentType = shape.props.docType || 'text';
    const metaConfig = DOC_TYPE_META[docType] || DOC_TYPE_META.text;
    const IconComponent = metaConfig.icon;

    const handleContentChange = (newContent: string, extraMeta?: Record<string, any>) => {
      if (isReadOnly) return;
      editor.updateShape({
        id: shape.id,
        type: 'document_block',
        props: {
          content: newContent,
          meta: extraMeta ? { ...shape.props.meta, ...extraMeta } : shape.props.meta,
        },
      } as any);
    };

    const handleTitleChange = (newTitle: string) => {
      if (isReadOnly) return;
      editor.updateShape({
        id: shape.id,
        type: 'document_block',
        props: {
          title: newTitle,
        },
      } as any);
    };

    const handleDuplicate = () => {
      if (isReadOnly) return;
      editor.duplicateShapes([shape.id]);
    };

    const handleDelete = () => {
      if (isReadOnly) return;
      editor.deleteShapes([shape.id]);
    };

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: 'all',
        }}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-300/80 bg-white/95 text-neutral-900 shadow-xl backdrop-blur-md transition-shadow hover:shadow-2xl dark:border-neutral-700/80 dark:bg-neutral-900/95 dark:text-neutral-100"
      >
        {/* Document Header Bar */}
        <div
          className="flex h-9 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-neutral-100/90 px-3 select-none dark:border-neutral-800/80 dark:bg-neutral-800/90"
        >
          {/* Left info: Icon, Type Badge & Editable Title */}
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase shrink-0 ${metaConfig.colorBadge}`}
            >
              <IconComponent size={11} />
              <span>{docType}</span>
            </span>

            <input
              type="text"
              value={shape.props.title || metaConfig.defaultTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              readOnly={isReadOnly}
              title="Click to rename document"
              className="min-w-[60px] max-w-[240px] truncate border-b border-transparent bg-transparent text-xs font-semibold text-neutral-800 outline-none hover:border-neutral-400 focus:border-brand dark:text-neutral-200 dark:hover:border-neutral-500"
            />
          </div>

          {/* Right actions: Duplicate, Delete */}
          <div
            className="flex items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  title="Duplicate Document Block"
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete Document Block"
                  className="rounded p-1 text-neutral-500 hover:bg-red-100 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Document Body */}
        <div className="relative flex-1 overflow-hidden">
          {docType === 'text' && (
            <TextEditorBlock
              content={shape.props.content}
              onChange={(c) => handleContentChange(c)}
              readOnly={isReadOnly}
            />
          )}

          {docType === 'code' && (
            <CodeEditorBlock
              content={shape.props.content}
              language={shape.props.meta?.language || 'typescript'}
              onChange={(c) => handleContentChange(c)}
              onLanguageChange={(lang) => handleContentChange(shape.props.content, { language: lang })}
              readOnly={isReadOnly}
            />
          )}

          {docType === 'sheet' && (
            <SpreadsheetBlock
              content={shape.props.content}
              meta={shape.props.meta}
              onChange={(c, m) => handleContentChange(c, m)}
              readOnly={isReadOnly}
            />
          )}

          {docType === 'pdf' && (
            <PdfViewerBlock
              content={shape.props.content}
              meta={shape.props.meta}
              onChange={(c, m) => handleContentChange(c, m)}
              readOnly={isReadOnly}
            />
          )}

          {docType === 'slides' && (
            <SlideshowBlock
              content={shape.props.content}
              meta={shape.props.meta}
              onChange={(c, m) => handleContentChange(c, m)}
              readOnly={isReadOnly}
            />
          )}
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: IDocumentShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={12}
        ry={12}
        className="stroke-brand fill-transparent"
        strokeWidth={2}
      />
    );
  }
}
