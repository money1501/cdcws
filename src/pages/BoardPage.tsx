import {
  ArrowLeft,
  Check,
  FolderLock,
  Globe,
  Link as LinkIcon,
  Lock,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Sparkles,
  LogIn,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  createBoard,
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
import { renderThumbnail } from "@/features/canvas/render-thumbnail";
import { DrawgonLoader } from "@/components/DrawgonLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Board, BoardPostMedia, BoardCollaborator } from "@shared/board";
import type { CommunitySummary } from "@shared/community";
import type { ActiveCollaborator } from "@/features/canvas/useBoardSync";
import { useSession } from "@/lib/auth-client";
import { useAuthModal } from "@/lib/auth-modal-context";
import { useToast } from "@/components/toast/ToastProvider";
import { Avatar } from "@/components/Avatar";

const DEFAULT_LOCAL_BOARD: Board = {
  id: "local",
  ownerId: "local_user",
  title: "Untitled board",
  publishedFromId: null,
  postTitle: null,
  postDetails: null,
  postTags: [],
  postMedia: [],
  visibility: "private",
  communityId: null,
  thumbnailUrl: null,
  snapshot: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function BoardPage() {
  const { boardId } = useParams<{ boardId?: string }>();
  const isExplicitId = Boolean(boardId && boardId !== "local" && boardId !== "new");

  const [board, setBoard] = useState<Board | null>(() =>
    isExplicitId ? null : DEFAULT_LOCAL_BOARD,
  );
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
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<BoardCollaborator[]>([]);

  const [editor, setEditor] = useState<Editor | null>(null);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { requireAuth, openAuthModal } = useAuthModal();
  const toast = useToast();
  const { toggleOpen: toggleFilesOpen, fileCount, isOpen: filesSidebarOpen } = usePersonalFilesStore();

  const isLocalMode = !board || board.id === "local" || !session?.user;
  const isUpgradingRef = useRef(false);

  // Upgrade in-memory anonymous board to a persisted board on server
  const upgradeBoard = useCallback(async () => {
    if (isUpgradingRef.current || !editor) return null;
    isUpgradingRef.current = true;
    try {
      const snapshot = editor.getSnapshot() as unknown as Record<string, unknown>;
      const thumbnail = await renderThumbnail(editor);
      const currentTitle = board?.title || "Untitled board";

      const created = await createBoard({
        title: currentTitle,
        snapshot,
        thumbnail,
      });

      setBoard(created);
      navigate(`/boards/${created.id}`, { replace: true });
      toast.success("Board saved to your account!");
      return created;
    } catch (err) {
      console.error("Failed to upgrade board:", err);
      toast.error("Could not save board to your account.");
      return null;
    } finally {
      isUpgradingRef.current = false;
    }
  }, [editor, board?.title, navigate, toast]);

  // Seamlessly upgrade anonymous board if user signs in while drawing
  useEffect(() => {
    if (session?.user && board?.id === "local" && editor && !isUpgradingRef.current) {
      void upgradeBoard();
    }
  }, [session?.user, board?.id, editor, upgradeBoard]);

  // Fetch persisted board when explicit boardId is in URL
  useEffect(() => {
    if (!isExplicitId || !boardId) {
      if (!board) setBoard(DEFAULT_LOCAL_BOARD);
      return;
    }

    setError(null);
    getBoard(boardId)
      .then((data) => {
        setBoard(data);
        listCollaborators(boardId)
          .then(setCollaborators)
          .catch(() => setCollaborators([]));
      })
      .catch(() => {
        setError(
          session?.user
            ? "Board not found or you do not have permission to view it."
            : "This board requires you to log in.",
        );
      });
  }, [boardId, isExplicitId, session?.user]);

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
  }, [publishOpen, board?.communityId]);

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

  async function doOpenPublishDialog() {
    if (!board) return;
    setPublishForm({
      postTitle: board.title,
      details: "",
      tags: "",
    });
    setPostMedia([]);
    setSelectedCommunities([]);
    setCommunitySearch("");

    const userId = session?.user?.id || "local_user";
    const personal = await getPersonalFiles(board.id, userId);
    setAvailablePrivateFiles(personal);
    setSelectedPrivateFileIds([]);

    setPublishOpen(true);
  }

  function handlePublishClick() {
    requireAuth(
      () => {
        void doOpenPublishDialog();
      },
      {
        reason: "publish",
        title: "Log in to publish board",
        description: "Publish your board to the community feed and showcase your work.",
      },
    );
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
      toast.success("Board published to community!");
    } catch {
      toast.error("Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  function handleVisibilityClick() {
    requireAuth(
      () => {
        setVisibilityConfirmOpen(true);
      },
      {
        reason: "save",
        title: "Log in to change visibility",
        description: "Save this board to your account to control public or private access.",
      },
    );
  }

  async function confirmVisibilityChange() {
    if (!board) return;
    setVisibilityConfirmOpen(false);
    try {
      const updated = await updateBoardVisibility(
        board.id,
        board.visibility === "public" ? "private" : "public",
      );
      setBoard(updated);
      toast.success(`Board is now ${updated.visibility}`);
    } catch {
      toast.error("Could not update board visibility.");
    }
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

  function handleCollaboratorsClick() {
    requireAuth(
      () => {
        setInviteOpen(true);
      },
      {
        reason: "collaborate",
        title: "Log in to invite collaborators",
        description: "Draw live together with friends and teammates in real time.",
      },
    );
  }

  async function handleInvite() {
    if (!board || inviting || !inviteUsername.trim()) return;
    setInviting(true);
    try {
      await inviteCollaborator(board.id, inviteUsername.trim(), inviteRole);
      const updatedList = await listCollaborators(board.id);
      setCollaborators(updatedList);
      setInviteUsername("");
      toast.success(`Invited ${inviteUsername.trim()}!`);
    } catch {
      toast.error("Could not send invite.");
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
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Could not generate invite link.");
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    if (!board) return;
    try {
      await removeCollaborator(board.id, userId);
      setCollaborators((curr) => curr.filter((c) => c.userId !== userId));
      toast.success("Collaborator removed.");
    } catch {
      toast.error("Could not remove collaborator.");
    }
  }

  const isOwner = session?.user?.id === board?.ownerId || board?.id === "local";

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-center dark:bg-neutral-950">
        <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
        <div className="flex items-center gap-3">
          {!session?.user ? (
            <button
              type="button"
              onClick={() => openAuthModal({ reason: "general", title: "Log in to view board" })}
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Log in to view
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setBoard(DEFAULT_LOCAL_BOARD);
              setError(null);
              navigate("/board", { replace: true });
            }}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Start new whiteboard
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return <DrawgonLoader label="Loading whiteboard..." />;
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-neutral-950">
      {/* Whiteboard Top Navigation Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            to={session?.user ? "/" : "/community"}
            aria-label="Back"
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

          {/* Publish Action Button */}
          <button
            type="button"
            onClick={handlePublishClick}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-hover shadow-xs"
          >
            <Globe size={13} />
            Publish
          </button>

          {/* Visibility Toggle Button */}
          <button
            type="button"
            onClick={handleVisibilityClick}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          >
            {board.visibility === "public" ? (
              <Globe size={13} />
            ) : (
              <Lock size={13} />
            )}
            {board.visibility === "public" ? "Public" : "Private"}
          </button>

          {/* Collaborators Button */}
          <button
            type="button"
            onClick={handleCollaboratorsClick}
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

          {/* Personal Files Sidebar Button */}
          <button
            type="button"
            onClick={toggleFilesOpen}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filesSidebarOpen
                ? "bg-amber-100 text-amber-900 shadow-xs dark:bg-amber-500/20 dark:text-amber-300"
                : "text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
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

          {/* Delete Button (persisted owner only) */}
          {board.id !== "local" && isOwner && (
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

          {/* Active Collaborators Pulse */}
          {activeCollaborators.length > 0 && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-500/15 dark:text-emerald-400"
              title={`Active now: ${activeCollaborators.map((c) => `${c.name} (${c.role})`).join(", ")}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium">
                {activeCollaborators.length === 1
                  ? "1 active"
                  : `${activeCollaborators.length} active`}
              </span>
            </div>
          )}
        </div>

        {/* Right Action Bar (Auth & Theme) */}
        <div className="flex items-center gap-2">
          {!session?.user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <Sparkles size={12} />
                Anonymous Mode
              </span>
              <button
                type="button"
                onClick={() =>
                  openAuthModal({
                    reason: "save",
                    title: "Save whiteboard to account",
                    description: "Log in or create an account to save your drawing permanently.",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover"
              >
                <LogIn size={13} />
                <span>Save Board</span>
              </button>
            </div>
          ) : (
            <Link
              to="/profile"
              title={session.user.email}
              className="rounded-full transition hover:opacity-80"
            >
              <Avatar
                name={session.user.name || session.user.email || "?"}
                size="sm"
              />
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Main Canvas & Sidebars */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1 h-full overflow-hidden">
          <BoardCanvas
            boardId={board.id}
            initialSnapshot={board.snapshot}
            isLocalMode={isLocalMode}
            onEditorReady={setEditor}
            onActiveCollaboratorsChange={setActiveCollaborators}
          />
          <VoiceBar boardId={board.id} />
        </div>
        <PersonalFilesSidebar boardId={board.id} />
      </div>

      <ShareTray editor={editor} title={board.title} />

      {/* Publish Dialog */}
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
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      Select communities
                    </span>
                    <div className="relative mb-2">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
                      <input
                        value={communitySearch}
                        onChange={(e) => setCommunitySearch(e.target.value)}
                        placeholder="Search communities..."
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                    <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
                      {filteredCommunities.map((c) => {
                        const selected = selectedCommunities.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCommunitySelection(c.id)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                              selected
                                ? "bg-brand/10 text-brand dark:bg-brand/20"
                                : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            }`}
                          >
                            <span>d/{c.slug}</span>
                            {selected && <Check size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {availablePrivateFiles.length > 0 && (
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        Attach personal files (optional)
                      </span>
                      <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
                        {availablePrivateFiles.map((file) => {
                          const isSelected = selectedPrivateFileIds.includes(file.id);
                          return (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => togglePrivateFileSelection(file.id)}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                                isSelected
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300"
                                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                              }`}
                            >
                              <span className="truncate">{file.name}</span>
                              <span className="text-[10px] opacity-70">
                                {formatFileSize(file.size)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      Attach screenshots / images
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => void handleMediaChange(e)}
                      className="w-full text-xs text-neutral-500 file:mr-2 file:rounded-full file:border-0 file:bg-brand/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand hover:file:bg-brand/20 dark:file:bg-brand/20 dark:file:text-brand"
                    />
                    {postMedia.length > 0 && (
                      <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        {postMedia.length} image{postMedia.length > 1 ? "s" : ""} attached
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing || selectedCommunities.length === 0 || !publishForm.postTitle.trim()}
                onClick={() => void handlePublish()}
                className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Confirmation Dialog */}
      {visibilityConfirmOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Change visibility to {board.visibility === "public" ? "Private" : "Public"}?
            </h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {board.visibility === "public"
                ? "Making this board private will remove it and all community post associations."
                : "Making this board public allows anyone with the link to view it."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
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

      {/* Collaborators Dialog */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand">
                  Board collaborators
                </p>
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
                onClick={() => setInviteRole("editor")}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  inviteRole === "editor"
                    ? "border-brand bg-brand/5 text-neutral-900 dark:border-brand dark:bg-brand/10 dark:text-neutral-50"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                <p className="font-medium">Editor</p>
                <p className="mt-0.5 text-xs text-neutral-500">Can draw and edit content</p>
              </button>
              <button
                type="button"
                onClick={() => setInviteRole("viewer")}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  inviteRole === "viewer"
                    ? "border-brand bg-brand/5 text-neutral-900 dark:border-brand dark:bg-brand/10 dark:text-neutral-50"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300"
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
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleInvite();
                }}
                className="flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <button
                type="button"
                disabled={inviting || !inviteUsername.trim()}
                onClick={() => void handleInvite()}
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
              >
                {inviting ? "Inviting…" : "Invite"}
              </button>
            </div>

            {collaborators.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Shared with ({collaborators.length})
                </p>
                <ul className="max-h-52 space-y-2 overflow-y-auto">
                  {collaborators.map((c) => (
                    <li
                      key={c.userId}
                      className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900"
                    >
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
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            c.role === "editor"
                              ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
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
