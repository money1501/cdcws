import {
  ArrowLeft,
  Check,
  FileImage,
  FileText,
  FolderLock,
  Globe,
  Link as LinkIcon,
  Lock,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Editor } from "@tldraw/tldraw";
import {
  deleteBoard,
  getBoard,
  publishBoard,
  updateBoardVisibility,
  inviteCollaborator,
  listCollaborators,
  removeCollaborator,
  generateInviteLink,
} from "@/lib/boards-api";
import { listCommunities, setBoardCommunities } from "@/lib/communities-api";
import { BoardCanvas } from "@/features/canvas/BoardCanvas";
import { ShareTray } from "@/features/share/ShareTray";
import { BoardTitle } from "@/features/canvas/BoardTitle";
import { VoiceBar } from "@/features/voice/VoiceBar";
import { PersonalFilesSidebar } from "@/features/files/PersonalFilesSidebar";
import { usePersonalFilesStore } from "@/features/files/usePersonalFilesStore";
import {
  getPersonalFiles,
  formatFileSize,
  type StoredPersonalFile,
} from "@/features/files/personalFilesDb";
import { DrawgonLoader } from "@/components/DrawgonLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Board, BoardPostMedia, BoardCollaborator } from "@shared/board";
import type { CommunitySummary } from "@shared/community";
import type { ActiveCollaborator } from "@/features/canvas/useBoardSync";
import { useSession } from "@/lib/auth-client";
import { Avatar } from "@/components/Avatar";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState<ActiveCollaborator[]>([]);
  const [visibilityConfirmOpen, setVisibilityConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishForm, setPublishForm] = useState({
    postTitle: "",
    details: "",
    tags: "",
  });
  const [postMedia, setPostMedia] = useState<BoardPostMedia[]>([]);
  const [availablePrivateFiles, setAvailablePrivateFiles] = useState<StoredPersonalFile[]>([]);
  const [selectedPrivateFileIds, setSelectedPrivateFileIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([
    "thumbnail",
    "cover-image",
  ]);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<BoardCollaborator[]>([]);
  
  const [editor, setEditor] = useState<Editor | null>(null);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { toggleOpen: toggleFilesOpen, fileCount, isOpen: filesSidebarOpen } = usePersonalFilesStore();

  useEffect(() => {
    if (!boardId) return;
    getBoard(boardId)
      .then(setBoard)
      .catch(() => setError("Board not found."));
      
    listCollaborators(boardId)
      .then(setCollaborators)
      .catch(() => setCollaborators([]));
  }, [boardId]);

  useEffect(() => {
    if (!publishOpen) return;

    listCommunities()
      .then((items) => {
        setCommunities(items);
        setSelectedCommunities((prev) =>
          board?.communityId ? [board.communityId] : [...prev],
        );
      })
      .catch(() => setCommunities([]));
  }, [publishOpen]);

  const filteredCommunities = communities.filter((community) => {
    const query = communitySearch.trim().toLowerCase();
    if (!query) return true;
    return (
      community.name.toLowerCase().includes(query) ||
      community.slug.toLowerCase().includes(query)
    );
  });

  function togglePrivateFileSelection(fileId: string) {
    setSelectedPrivateFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId],
    );
  }

  async function openPublishDialog() {
    if (!board) return;
    setPublishForm({
      postTitle: board.title,
      details: "",
      tags: "",
    });
    setPostMedia([]);
    setSelectedFiles(["thumbnail", "cover-image"]);
    setSelectedCommunities([]);
    setCommunitySearch("");

    const userId = session?.user?.id || 'local_user';
    const personal = await getPersonalFiles(board.id, userId);
    setAvailablePrivateFiles(personal);
    setSelectedPrivateFileIds([]);

    setPublishOpen(true);
  }

  async function handlePublish() {
    if (
      !board ||
      publishing ||
      selectedCommunities.length === 0 ||
      !publishForm.postTitle.trim()
    )
      return;
    setPublishing(true);
    try {
      // Convert selected private files to data URLs to include in postMedia
      const selectedPrivateMedia = await Promise.all(
        availablePrivateFiles
          .filter((f) => selectedPrivateFileIds.includes(f.id))
          .map(
            (f) =>
              new Promise<BoardPostMedia>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve({
                    name: f.name,
                    type: f.type,
                    url: String(reader.result),
                  });
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(f.blob);
              }),
          ),
      );

      const publishedPost = await publishBoard(board.id, {
        postTitle: publishForm.postTitle,
        postDetails: publishForm.details,
        postTags: publishForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        postMedia: [...postMedia, ...selectedPrivateMedia],
      });
      const selectedSlugs = communities
        .filter((community) => selectedCommunities.includes(community.id))
        .map((community) => community.slug);
      await setBoardCommunities(publishedPost.id, selectedSlugs);
      setPublishOpen(false);
    } catch {
      alert('Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  async function confirmVisibilityChange() {
    if (!board) return;
    setVisibilityConfirmOpen(false);
    const updated = await updateBoardVisibility(
      board.id,
      board.visibility === "public" ? "private" : "public",
    );
    setBoard(updated);
  }

  function toggleCommunitySelection(communityId: string) {
    setSelectedCommunities((current) =>
      current.includes(communityId)
        ? current.filter((id) => id !== communityId)
        : [...current, communityId],
    );
  }

  async function handleMediaChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const media = await Promise.all(
      files.map(
        (file) =>
          new Promise<BoardPostMedia>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type,
                url: String(reader.result),
              });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setPostMedia((current) => [...current, ...media]);
    event.target.value = "";
  }

  function openVisibilityConfirmation() {
    if (!board) return;
    setVisibilityConfirmOpen(true);
  }

  async function handleDelete() {
    if (!board || deleting) return;
    if (!window.confirm(`Delete “${board.title}”? This cannot be undone.`))
      return;
    setDeleting(true);
    try {
      await deleteBoard(board.id);
      navigate("/");
    } finally {
      setDeleting(false);
    }
  }

  async function handleInvite() {
    if (!board || inviting || !inviteUsername.trim()) return;
    setInviting(true);
    try {
      await inviteCollaborator(board.id, inviteUsername.trim(), inviteRole);
      const updatedList = await listCollaborators(board.id);
      setCollaborators(updatedList);
      setInviteUsername('');
    } finally {
      setInviting(false);
    }
  }

  async function handleCopyInviteLink() {
    if (!board) return;
    try {
      const { token } = await generateInviteLink(board.id, inviteRole);
      const url = `${window.location.origin}/boards/join/${token}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // silently fail
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    if (!board) return;
    try {
      await removeCollaborator(board.id, userId);
      setCollaborators((curr) => curr.filter((c) => c.userId !== userId));
    } catch {}
  }

  const isOwner = session?.user?.id === board?.ownerId;

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-neutral-500">{error}</p>
        <Link to="/" className="text-sm underline">
          Back to boards
        </Link>
      </div>
    );
  }

  if (!board) {
    return <DrawgonLoader label="Loading board..." />;
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <div className="flex items-center gap-1">
          <Link
            to="/"
            aria-label="Back to my boards"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <BoardTitle
            boardId={board.id}
            title={board.title}
            onRenamed={(title) => setBoard({ ...board, title })}
          />
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <button
            type="button"
            onClick={openPublishDialog}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-hover"
          >
            <Globe size={13} />
            Publish
          </button>
          <button
            type="button"
            onClick={openVisibilityConfirmation}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200/70 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          >
            {board.visibility === "public" ? (
              <Globe size={13} />
            ) : (
              <Lock size={13} />
            )}
            {board.visibility === "public" ? "Public" : "Private"}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              <Users size={13} />
              Collaborators
              {collaborators.length > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                  {collaborators.length}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={toggleFilesOpen}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filesSidebarOpen
                ? 'bg-amber-100 text-amber-900 shadow-xs dark:bg-amber-500/20 dark:text-amber-300'
                : 'text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50'
            }`}
            title="Open private files sidebar (Claude-style side panel for PDF, DOCX, XLSX, etc.)"
          >
            <FolderLock size={13} className="text-amber-500" />
            <span>Files</span>
            {fileCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                {fileCount}
              </span>
            )}
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              aria-label="Delete board"
              title="Delete board"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:text-neutral-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            >
              <Trash2 size={15} />
            </button>
          )}
          {activeCollaborators.length > 0 && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-500/15 dark:text-emerald-400"
              title={`Active now: ${activeCollaborators.map((c) => `${c.name} (${c.role})`).join(', ')}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium">
                {activeCollaborators.length === 1 ? '1 active' : `${activeCollaborators.length} active`}
              </span>
            </div>
          )}
        </div>
        <ThemeToggle />
      </div>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1 h-full overflow-hidden">
          <BoardCanvas
            boardId={board.id}
            initialSnapshot={board.snapshot}
            onEditorReady={setEditor}
            onActiveCollaboratorsChange={setActiveCollaborators}
          />
          <VoiceBar boardId={board.id} />
        </div>
        <PersonalFilesSidebar boardId={board.id} />
      </div>
      <ShareTray editor={editor} title={board.title} />

      {publishOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-5xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-0 flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                  Publish board
                </p>
                <h2 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                  Create a new post
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                aria-label="Close publish dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-neutral-200 p-5 dark:border-neutral-800 md:border-b-0 md:border-r">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      Post title
                    </span>
                    <input
                      value={publishForm.postTitle}
                      onChange={(e) =>
                        setPublishForm({
                          ...publishForm,
                          postTitle: e.target.value,
                        })
                      }
                      placeholder="What is this post about?"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      Details
                    </span>
                    <textarea
                      value={publishForm.details}
                      onChange={(e) =>
                        setPublishForm({
                          ...publishForm,
                          details: e.target.value,
                        })
                      }
                      rows={5}
                      placeholder="Write the context, question, or story behind your board..."
                      className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    />
                  </label>

                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      Tags
                    </span>
                    <div className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                      {["branding", "storyboard", "moodboard", "concept"].map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setPublishForm((prev) => ({
                                ...prev,
                                tags: prev.tags ? `${prev.tags}, ${tag}` : tag,
                              }))
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:border-brand hover:text-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                          >
                            <Plus size={12} />
                            {tag}
                          </button>
                        ),
                      )}

                    </div>
                    <input
                      value={publishForm.tags}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, tags: e.target.value })
                      }
                      placeholder="Add tags separated by commas"
                      className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        Select files to show
                      </span>
                      {availablePrivateFiles.length > 0 && (
                        <span className="text-[11px] text-neutral-500">
                          {selectedPrivateFileIds.length} of {availablePrivateFiles.length} private files selected
                        </span>
                      )}
                    </div>

                    {/* Private Files Selection for Board Owner */}
                    {availablePrivateFiles.length > 0 && (
                      <div className="mb-3 space-y-1.5 max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-200/60 dark:border-neutral-800">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <FolderLock size={12} />
                            Your Private Files
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Check to publish with post
                          </span>
                        </div>
                        {availablePrivateFiles.map((file) => {
                          const isChecked = selectedPrivateFileIds.includes(file.id);
                          return (
                            <label
                              key={file.id}
                              className={`flex items-center justify-between gap-2 rounded-lg p-2 text-xs transition cursor-pointer border ${
                                isChecked
                                  ? 'bg-amber-500/10 border-amber-500/40 text-neutral-900 dark:text-neutral-100 font-medium'
                                  : 'bg-white border-neutral-200/80 text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePrivateFileSelection(file.id)}
                                  className="h-3.5 w-3.5 rounded border-neutral-300 text-brand focus:ring-brand accent-brand"
                                />
                                <span className="truncate">{file.name}</span>
                              </div>
                              <span className="shrink-0 text-[10px] text-neutral-400">
                                {formatFileSize(file.size)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-sm text-neutral-600 transition hover:border-brand hover:text-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                      <FileImage size={16} />
                      <span>Upload additional media from device</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,audio/*,.pdf,.docx,.xlsx,.csv,.txt"
                        onChange={(event) => void handleMediaChange(event)}
                        className="sr-only"
                      />
                    </label>
                    {postMedia.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {postMedia.map((media, index) => (
                          <div
                            key={`${media.name}-${index}`}
                            className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800"
                          >
                            <span className="truncate">{media.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPostMedia((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                              className="ml-2 text-neutral-500 hover:text-red-500"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                    Popular communities
                  </p>
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="search"
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      placeholder="Search active communities"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>

                {!communitySearch.trim() && (
                  <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    {(communities.length > 0
                      ? communities.slice(0, 4)
                      : []
                    ).map((community) => {
                      const checked = selectedCommunities.includes(
                        community.id,
                      );
                      return (
                        <button
                          key={community.id}
                          type="button"
                          onClick={() => toggleCommunitySelection(community.id)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            checked
                              ? "border-brand bg-brand/5 text-neutral-900 dark:border-brand dark:bg-brand/10 dark:text-neutral-50"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              d/{community.slug}
                            </span>
                            {checked && (
                              <Check size={14} className="text-brand" />
                            )}
                          </div>
                          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {community.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-44 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
                  {filteredCommunities.length === 0 && (
                    <p className="px-2 py-4 text-sm text-neutral-500">
                      No communities match your search.
                    </p>
                  )}

                  {filteredCommunities.map((community) => {
                    const checked = selectedCommunities.includes(community.id);
                    return (
                      <button
                        key={community.id}
                        type="button"
                        onClick={() => toggleCommunitySelection(community.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                          checked
                            ? "bg-brand/5 text-neutral-900 dark:bg-brand/10 dark:text-neutral-50"
                            : "text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <div>
                          <div className="font-medium">d/{community.slug}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {community.name}
                          </div>
                        </div>
                        {checked && <Check size={15} className="text-brand" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    Select files to show
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { id: "thumbnail", label: "Thumbnail", icon: FileImage },
                      {
                        id: "cover-image",
                        label: "Cover image",
                        icon: FileImage,
                      },
                      {
                        id: "board-notes",
                        label: "Board notes",
                        icon: FileText,
                      },
                      {
                        id: "reference",
                        label: "Reference board",
                        icon: FileText,
                      },
                    ].map(({ id, label, icon: Icon }) => {
                      const checked = selectedFiles.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            setSelectedFiles((current) =>
                              current.includes(id)
                                ? current.filter((file) => file !== id)
                                : [...current, id],
                            )
                          }
                          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                            checked
                              ? "border-brand bg-brand/5 text-neutral-900 dark:border-brand dark:bg-brand/10 dark:text-neutral-50"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon size={15} />
                            {label}
                          </span>
                          {checked && (
                            <Check size={15} className="text-brand" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {selectedCommunities.length} community
                {selectedCommunities.length === 1 ? "" : "ies"} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPublishOpen(false)}
                  className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={publishing || selectedCommunities.length === 0}
                  onClick={() => void handlePublish()}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-60"
                >
                  {publishing ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {visibilityConfirmOpen && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
              Change board visibility
            </p>
            <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Make this board{" "}
              {board.visibility === "public" ? "private" : "public"}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {board.visibility === "public"
                ? "All published posts from this board will be permanently removed from their communities."
                : "The board will be accessible publicly, but it will not create a community post until you publish one."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVisibilityConfirmOpen(false)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmVisibilityChange()}
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand">Board collaborators</p>
                <h2 className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Invite to &ldquo;{board.title}&rdquo;
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Role picker */}
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setInviteRole('editor')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  inviteRole === 'editor'
                    ? 'border-brand bg-brand/5 text-neutral-900 dark:border-brand dark:bg-brand/10 dark:text-neutral-50'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300'
                }`}
              >
                <p className="font-medium">Editor</p>
                <p className="mt-0.5 text-xs text-neutral-500">Can draw and edit content</p>
              </button>
              <button
                type="button"
                onClick={() => setInviteRole('viewer')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  inviteRole === 'viewer'
                    ? 'border-brand bg-brand/5 text-neutral-900 dark:border-brand dark:bg-brand/10 dark:text-neutral-50'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300'
                }`}
              >
                <p className="font-medium">Viewer</p>
                <p className="mt-0.5 text-xs text-neutral-500">Can only view the board</p>
              </button>
            </div>

            {/* Invite link section */}
            <div className="mb-4 flex items-center justify-between rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-700 dark:bg-neutral-900/60">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Invite via link
                </p>
                <p className="truncate text-[11px] text-neutral-500">
                  Anyone with this link joins as {inviteRole}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyInviteLink()}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  linkCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check size={12} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <LinkIcon size={12} />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              <span className="absolute bg-white px-2 text-[10px] uppercase tracking-wider text-neutral-400 dark:bg-neutral-900">
                or invite by username
              </span>
            </div>

            {/* Username input */}
            <div className="mb-5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter username (e.g. janedoe)"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleInvite(); }}
                className="flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <button
                type="button"
                disabled={inviting || !inviteUsername.trim()}
                onClick={() => void handleInvite()}
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
              >
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
            </div>

            {collaborators.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Shared with ({collaborators.length})
                </p>
                <ul className="max-h-52 space-y-2 overflow-y-auto">
                  {collaborators.map((c) => (
                    <li key={c.userId} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} avatarUrl={c.avatarUrl} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                            {c.name}
                          </p>
                          {c.username && (
                            <p className="text-xs text-neutral-500">@{c.username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          c.role === 'editor'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>
                          {c.role}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveCollaborator(c.userId)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                          title="Remove collaborator"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
