import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  FolderLock,
  Globe,
  Link as LinkIcon,
  Lock,
  LogIn,
  Search,
  Trash2,
  Users,
  X,
  PenTool,
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
import { duplicateBoard } from "@/lib/community-api";
import { listCommunities, setBoardCommunities } from "@/lib/communities-api";
import { BoardCanvas } from "@/features/canvas/BoardCanvas";
import { ShareTray } from "@/features/share/ShareTray";
import { BoardTitle } from "@/features/canvas/BoardTitle";
import { VoiceBar } from "@/features/voice/VoiceBar";
import { PersonalFilesSidebar } from "@/features/files/PersonalFilesSidebar";
import { usePersonalFilesStore } from "@/features/files/usePersonalFilesStore";
import {
  getPersonalFiles,
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
import { CommunityAvatar } from "@/features/community/CommunityAvatar";

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
  anyoneCanEdit: false,
  originalOwnerId: null,
  originalOwnerName: null,
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
  const [duplicating, setDuplicating] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState<ActiveCollaborator[]>([]);
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

  // Share & Access dialog state
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
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

  function handlePublishClick() {
    requireAuth(
      async () => {
        let currentBoard = board;
        if (currentBoard?.id === "local" || !currentBoard) {
          currentBoard = await upgradeBoard();
          if (!currentBoard) return;
        }

        setPublishForm({
          postTitle: currentBoard.title || "",
          details: currentBoard.postDetails || "",
          tags: (currentBoard.postTags || []).join(", "),
        });
        setPostMedia(currentBoard.postMedia || []);

        const localFiles = await getPersonalFiles(currentBoard.id, session?.user?.id || "local_user");
        setAvailablePrivateFiles(localFiles);
        setSelectedPrivateFileIds([]);

        setPublishOpen(true);
      },
      {
        reason: "publish",
        title: "Log in to publish",
        description: "Save your board and share it with the Drawgon community.",
      },
    );
  }

  async function handlePublishSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!board || publishing) return;

    const trimmedTitle = publishForm.postTitle.trim();
    if (!trimmedTitle) {
      toast.error("Please provide a post title.");
      return;
    }

    setPublishing(true);
    try {
      const selectedFiles = availablePrivateFiles.filter((f) =>
        selectedPrivateFileIds.includes(f.id),
      );

      const selectedPrivateMedia = await Promise.all(
        selectedFiles
          .filter((f) => f.blob)
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
      if (selectedSlugs.length > 0) {
        await setBoardCommunities(publishedPost.id, selectedSlugs);
      }

      setBoard(publishedPost);
      setPublishOpen(false);
      toast.success("Board published to community! It is now permanently read-only.");
    } catch {
      toast.error("Failed to publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  function handleShareClick() {
    requireAuth(
      () => {
        setShareOpen(true);
      },
      {
        reason: "collaborate",
        title: "Log in to manage access",
        description: "Control who can view and edit this board.",
      },
    );
  }

  async function handleToggleVisibility(newVisibility: "private" | "public") {
    if (!board || updatingVisibility) return;
    setUpdatingVisibility(true);
    try {
      const updated = await updateBoardVisibility(
        board.id,
        newVisibility,
        board.anyoneCanEdit,
      );
      setBoard(updated);
      toast.success(`Board is now ${newVisibility}`);
    } catch {
      toast.error("Could not update board visibility.");
    } finally {
      setUpdatingVisibility(false);
    }
  }

  async function handleToggleAnyoneCanEdit(anyoneCanEdit: boolean) {
    if (!board || updatingVisibility) return;
    setUpdatingVisibility(true);
    try {
      const updated = await updateBoardVisibility(
        board.id,
        board.visibility,
        anyoneCanEdit,
      );
      setBoard(updated);
      toast.success(
        anyoneCanEdit
          ? "Anyone with the link can now edit!"
          : "Edit access restricted to invited editors only.",
      );
    } catch {
      toast.error("Could not update edit permissions.");
    } finally {
      setUpdatingVisibility(false);
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

  async function handleDuplicate() {
    if (!board || duplicating) return;
    if (board.id === "local") {
      toast.info("This is already a local in-memory board.");
      return;
    }

    requireAuth(
      async () => {
        setDuplicating(true);
        try {
          const copy = await duplicateBoard(board.id);
          toast.success("Board duplicated as private editable copy!");
          navigate(`/boards/${copy.id}`);
        } catch {
          toast.error("Failed to duplicate board.");
        } finally {
          setDuplicating(false);
        }
      },
      {
        reason: "save",
        title: "Log in to duplicate board",
        description: "Save a private editable copy of this board to your account.",
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
      toast.success(`Invited ${inviteUsername.trim()} as ${inviteRole}!`);
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

  async function handleCopyBoardLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Board link copied to clipboard!");
    } catch {
      toast.error("Could not copy link.");
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
  const isPublished = board?.visibility === "published";
  const isPublic = board?.visibility === "public";
  const canEdit =
    !isPublished &&
    (isOwner ||
      board?.id === "local" ||
      board?.anyoneCanEdit ||
      board?.role === "editor");
  const readOnly = !canEdit;

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
            Open New Canvas
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return <DrawgonLoader />;
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-100 dark:bg-neutral-950">
      {/* ── Top Bar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            title="Go to Home"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          >
            <ArrowLeft size={16} />
          </Link>

          {/* Board Title (read-only if published or viewer) */}
          {canEdit ? (
            <BoardTitle
              boardId={board.id}
              title={board.title}
              onRenamed={(title) => setBoard({ ...board, title })}
            />
          ) : (
            <span className="max-w-[200px] truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100 sm:max-w-xs">
              {board.title}
            </span>
          )}

          <span className="text-neutral-300 dark:text-neutral-700">|</span>

          {/* ── State Badges & Actions ── */}

          {/* 1. PUBLISHED STATE */}
          {isPublished && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/80 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-300">
                <Globe size={12} />
                <span>Published (Read-only)</span>
              </span>

              <button
                type="button"
                onClick={() => void handleDuplicate()}
                disabled={duplicating}
                title="Duplicate this published board to make an editable copy"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-2xs transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <Copy size={13} />
                <span>{duplicating ? "Duplicating..." : "Duplicate to edit"}</span>
              </button>
            </>
          )}

          {/* 2. NOT PUBLISHED (Private or Public) */}
          {!isPublished && (
            <>
              {/* Publish Button (Owner only) */}
              {isOwner && (
                <button
                  type="button"
                  onClick={handlePublishClick}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover"
                >
                  <Globe size={13} />
                  <span>Publish</span>
                </button>
              )}

              {/* Share & Access Button */}
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleShareClick}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isPublic
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {isPublic ? <Globe size={13} /> : <Lock size={13} />}
                  <span>{isPublic ? (board.anyoneCanEdit ? "Public (Open edit)" : "Public (View only)") : "Private"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                    {canEdit ? <PenTool size={11} /> : <Lock size={11} />}
                    <span>{canEdit ? "Can edit" : "View only"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDuplicate()}
                    disabled={duplicating}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-2xs transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <Copy size={13} />
                    <span>Duplicate</span>
                  </button>
                </div>
              )}

              {/* Collaborators Button (when logged in owner) */}
              {isOwner && board.id !== "local" && (
                <button
                  type="button"
                  onClick={handleShareClick}
                  className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                >
                  <Users size={13} />
                  <span>Collaborators</span>
                  {collaborators.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                      {collaborators.length}
                    </span>
                  )}
                </button>
              )}
            </>
          )}

          {/* Personal Files Sidebar Button */}
          <button
            type="button"
            onClick={toggleFilesOpen}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filesSidebarOpen
                ? "bg-amber-100 text-amber-900 shadow-xs dark:bg-amber-500/20 dark:text-amber-300"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            }`}
            title="Open files sidebar"
          >
            <FolderLock size={13} className="text-amber-500" />
            <span className="hidden sm:inline">Files</span>
            {fileCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                {fileCount}
              </span>
            )}
          </button>

          {/* Delete Button (persisted owner only) */}
          {board.id !== "local" && isOwner && !isPublished && (
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
          {session?.user ? (
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
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal({ reason: "general", initialMode: "login" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              <LogIn size={13} />
              <span>Log In</span>
            </button>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* ── Main Canvas Area ── */}
      <main className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <BoardCanvas
            boardId={board.id}
            initialSnapshot={board.snapshot}
            readOnly={readOnly}
            isLocalMode={isLocalMode}
            watermarkText={board.originalOwnerName}
            onEditorReady={setEditor}
            onActiveCollaboratorsChange={setActiveCollaborators}
          />
          <VoiceBar boardId={board.id} />
        </div>

        {/* Private files sidebar */}
        <PersonalFilesSidebar boardId={board.id} />
      </main>

      <ShareTray
        editor={editor}
        title={board.title}
        ownerName={board.originalOwnerName || session?.user?.name || "Anonymous"}
      />

      {/* ── Share & Access Modal ── */}
      {shareOpen && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Access & Sharing
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-neutral-900 dark:text-neutral-50">
                  {board.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Access State Switcher */}
            <div className="mb-5 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Board Access Mode
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleToggleVisibility("private")}
                  disabled={updatingVisibility}
                  className={`rounded-xl border p-3 text-left transition ${
                    board.visibility === "private"
                      ? "border-brand bg-brand/5 dark:border-brand dark:bg-brand/10"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Lock size={15} className={board.visibility === "private" ? "text-brand" : "text-neutral-400"} />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Private</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Only you and invited collaborators can access
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleVisibility("public")}
                  disabled={updatingVisibility}
                  className={`rounded-xl border p-3 text-left transition ${
                    board.visibility === "public"
                      ? "border-brand bg-brand/5 dark:border-brand dark:bg-brand/10"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe size={15} className={board.visibility === "public" ? "text-brand" : "text-neutral-400"} />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Public</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Anyone with the link can view this board
                  </p>
                </button>
              </div>

              {/* Public Edit Permission Toggle */}
              {board.visibility === "public" && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Open Collaborative Editing
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {board.anyoneCanEdit
                        ? "Anyone with the link can draw and make real-time changes."
                        : "View-only for link holders (only invited editors can draw)."}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={Boolean(board.anyoneCanEdit)}
                      onChange={(e) => void handleToggleAnyoneCanEdit(e.target.checked)}
                      disabled={updatingVisibility}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-neutral-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-neutral-700"></div>
                  </label>
                </div>
              )}
            </div>

            {/* Link Sharing */}
            <div className="mb-5">
              <div className="flex items-center justify-between rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Share Link
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">
                    {board.visibility === "public"
                      ? "Direct link to view this board"
                      : "Invite collaborators via link"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={board.visibility === "public" ? handleCopyBoardLink : () => void handleCopyInviteLink()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-hover"
                >
                  {linkCopied ? <Check size={12} /> : <LinkIcon size={12} />}
                  <span>{linkCopied ? "Copied!" : "Copy link"}</span>
                </button>
              </div>
            </div>

            {/* Invite by Username */}
            <div className="mb-5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Invite specific user
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter username..."
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleInvite();
                  }}
                  className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="button"
                  disabled={inviting || !inviteUsername.trim()}
                  onClick={() => void handleInvite()}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
                >
                  {inviting ? "Inviting…" : "Invite"}
                </button>
              </div>
            </div>

            {/* Collaborators List */}
            {collaborators.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Collaborators ({collaborators.length})
                </p>
                <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                  {collaborators.map((c) => (
                    <li
                      key={c.userId}
                      className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} avatarUrl={c.avatarUrl} size="sm" />
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {c.name}
                          </p>
                          <span className="text-[10px] text-neutral-400 uppercase font-medium">
                            {c.role}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveCollaborator(c.userId)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Publish Modal (with permanent read-only confirmation) ── */}
      {publishOpen && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 p-5 dark:border-neutral-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Publish to Community
                </p>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                  Publish &ldquo;{board.title}&rdquo;
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPublishOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Permanent Read-only Warning Banner */}
            <div className="mx-5 mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-bold">Publishing makes this board permanently read-only</p>
                  <p className="mt-0.5 leading-relaxed opacity-95">
                    Once published, no further edits can be made by anyone (including the owner). To make future revisions, you can duplicate this board and publish a new version.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePublishSubmit} className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Post Title
                </label>
                <input
                  value={publishForm.postTitle}
                  onChange={(e) => setPublishForm({ ...publishForm, postTitle: e.target.value })}
                  placeholder="What is this post about?"
                  required
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Details / Description
                </label>
                <textarea
                  value={publishForm.details}
                  onChange={(e) => setPublishForm({ ...publishForm, details: e.target.value })}
                  rows={4}
                  placeholder="Write the context, story, or description behind your board..."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Tags (comma separated)
                </label>
                <input
                  value={publishForm.tags}
                  onChange={(e) => setPublishForm({ ...publishForm, tags: e.target.value })}
                  placeholder="branding, storyboard, moodboard, concept"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </div>

              {/* Additional Media */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Additional Images ({postMedia.length} attached)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleMediaChange(e)}
                  className="block w-full text-xs text-neutral-500 file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-800 dark:file:text-neutral-200"
                />
              </div>

              {/* Optional Attachments from Board Files */}
              {availablePrivateFiles.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Attach Private Files to Post ({selectedPrivateFileIds.length} selected)
                  </label>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
                    {availablePrivateFiles.map((f) => {
                      const isSelected = selectedPrivateFileIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => togglePrivateFileSelection(f.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition ${
                            isSelected
                              ? "bg-brand/10 text-brand font-semibold dark:bg-brand/20"
                              : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <span className="truncate">{f.name}</span>
                          {isSelected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Communities Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Post to Communities
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                    placeholder="Search communities..."
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-8 pr-3 text-xs text-neutral-900 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
                  {filteredCommunities.map((c) => {
                    const selected = selectedCommunities.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCommunitySelection(c.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                          selected
                            ? "bg-brand/10 text-brand dark:bg-brand/20 font-semibold"
                            : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CommunityAvatar slug={c.slug} iconUrl={c.iconUrl} size="sm" />
                          <span className="truncate">d/{c.slug}</span>
                        </div>
                        {selected && <Check size={14} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setPublishOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing || !publishForm.postTitle.trim()}
                  className="rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-50"
                >
                  {publishing ? "Publishing..." : "Confirm & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
