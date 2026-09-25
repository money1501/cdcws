import {
  ArrowLeft,
  Check,
  Compass,
  Copy,
  FolderLock,
  Globe,
  Link as LinkIcon,
  Lock,
  PenTool,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  Sparkles,
  LogIn,
  AlertTriangle,
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
  duplicateBoard,
} from "@/lib/boards-api";
import { listMyCommunities, setBoardCommunities } from "@/lib/communities-api";
import { BoardCanvas } from "@/features/canvas/BoardCanvas";
import { ShareTray } from "@/features/share/ShareTray";
import { BoardTitle } from "@/features/canvas/BoardTitle";
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
  const [publishOpen, setPublishOpen] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState<ActiveCollaborator[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [privatePostWarningOpen, setPrivatePostWarningOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishForm, setPublishForm] = useState({
    postTitle: "",
    details: "",
    tags: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [postMedia, setPostMedia] = useState<BoardPostMedia[]>([]);
  const [availablePrivateFiles, setAvailablePrivateFiles] = useState<StoredPersonalFile[]>([]);
  const [selectedPrivateFileIds, setSelectedPrivateFileIds] = useState<string[]>([]);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<BoardCollaborator[]>([]);
  const [duplicating, setDuplicating] = useState(false);

  const [editor, setEditor] = useState<Editor | null>(null);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { requireAuth, openAuthModal } = useAuthModal();
  const toast = useToast();
  const { toggleOpen: toggleFilesOpen, fileCount, isOpen: filesSidebarOpen } = usePersonalFilesStore();

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

    listMyCommunities()
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

  const currentTags = publishForm.tags
    ? publishForm.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];

  function addTag(rawTag: string) {
    const cleanTag = rawTag.trim().toLowerCase().replace(/^#/, "");
    if (!cleanTag) return;
    if (!currentTags.includes(cleanTag)) {
      setPublishForm((prev) => ({
        ...prev,
        tags: [...currentTags, cleanTag].join(", "),
      }));
    }
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    const updated = currentTags.filter((t) => t !== tagToRemove.toLowerCase());
    setPublishForm((prev) => ({
      ...prev,
      tags: updated.join(", "),
    }));
  }

  function toggleTag(tag: string) {
    if (currentTags.includes(tag.toLowerCase())) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  }

  async function doOpenPublishDialog() {
    if (!board) return;
    setPublishForm({
      postTitle: board.title,
      details: "",
      tags: "",
    });
    setTagInput("");
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
    if (!isOwner) {
      toast.error("Only the board owner can post this board.");
      return;
    }
    requireAuth(
      () => {
        if (board?.visibility !== "public") {
          setPrivatePostWarningOpen(true);
          return;
        }
        void doOpenPublishDialog();
      },
      {
        reason: "publish",
        title: "Log in to post board",
        description: "Post your board to the community feed and showcase your work.",
      },
    );
  }

  async function handleMakePublicAndPost() {
    if (!board) return;
    try {
      const updated = await updateBoardVisibility(
        board.id,
        "public",
      );
      setBoard(updated);
      setPrivatePostWarningOpen(false);
      toast.success("Board is now Public!");
      void doOpenPublishDialog();
    } catch {
      toast.error("Could not update board visibility.");
    }
  }

  async function handlePublish() {
    if (!board) return;
    if (board.visibility !== "public") {
      setPrivatePostWarningOpen(true);
      return;
    }
    if (
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
      toast.success("Board posted to community!");
    } catch {
      toast.error("Failed to post board. Please try again.");
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

  async function handleCopyBoardLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Board link copied to clipboard!");
    } catch {
      toast.error("Could not copy link.");
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


  async function handleInvite() {
    if (!board || !isOwner || inviting || !inviteUsername.trim()) return;
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
    if (!board || !isOwner) return;
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
    if (!isOwner && userId !== session?.user?.id) {
      toast.error("Only the board owner can remove collaborators.");
      return;
    }
    try {
      await removeCollaborator(board.id, userId);
      setCollaborators((curr) => curr.filter((c) => c.userId !== userId));
      toast.success("Collaborator removed.");
    } catch {
      toast.error("Could not remove collaborator.");
    }
  }

  async function handleDuplicate() {
    if (!session?.user) {
      openAuthModal({
        reason: "general",
        title: "Log in to duplicate board",
        description: "Sign in to create your own copy of this whiteboard.",
      });
      return;
    }
    if (!board || board.id === "local") return;

    setDuplicating(true);
    try {
      const copy = await duplicateBoard(board.id);
      toast.success("Board copied! Opening your copy...");
      navigate(`/boards/${copy.id}`);
    } catch {
      toast.error("Could not copy board. Please try again.");
    } finally {
      setDuplicating(false);
    }
  }

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
            canRename={isOwner}
          />

          <span className="text-neutral-300 dark:text-neutral-700">|</span>

          {/* Post Action Button (Owner only) */}
          {isOwner && (
            <button
              type="button"
              onClick={handlePublishClick}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-hover shadow-xs"
            >
              <Globe size={13} />
              Post
            </button>
          )}

          {/* Share & Access Button */}
          {isOwner ? (
            <button
              type="button"
              onClick={handleShareClick}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${isPublic
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

          {/* Make a Copy Button (Owner) */}
          {board.id !== "local" && isOwner && (
            <button
              type="button"
              onClick={() => void handleDuplicate()}
              disabled={duplicating}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 disabled:opacity-50"
              title="Create your own copy of this board"
            >
              <Copy size={13} />
              {duplicating ? "Copying..." : "Make a copy"}
            </button>
          )}

          {/* Personal Files Sidebar Button */}
          <button
            type="button"
            onClick={toggleFilesOpen}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${filesSidebarOpen
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
            readOnly={readOnly}
            isLocalMode={isLocalMode}
            watermarkText={board.originalOwnerName}
            onEditorReady={setEditor}
            onActiveCollaboratorsChange={setActiveCollaborators}
          />
        </div>
        <PersonalFilesSidebar boardId={board.id} />
      </div>

      <ShareTray
        editor={editor}
        title={board.title}
        ownerName={board.originalOwnerName || session?.user?.name || "Anonymous"}
      />

      {/* Publish Dialog */}
      {publishOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-5xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-0 flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand">
                  Post board
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

                    {/* Active tag chips */}
                    {currentTags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {currentTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand dark:bg-brand/20"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              aria-label={`Remove tag ${tag}`}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-brand/20 dark:hover:bg-brand/30"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Custom tag input */}
                    <div className="mb-2 flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Add a tag and press Enter..."
                        className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      />
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        disabled={!tagInput.trim()}
                        className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-brand hover:text-brand disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>

                    {/* Suggested tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {["branding", "storyboard", "moodboard", "concept", "ui", "ux"].map(
                        (tag) => {
                          const active = currentTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${active
                                  ? "border-brand bg-brand/10 text-brand dark:bg-brand/20"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:border-brand hover:text-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                                }`}
                            >
                              {active ? <Check size={11} /> : <Plus size={11} />}
                              {tag}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        Your joined communities
                      </span>
                      <Link
                        to="/communities"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        title="Explore and join communities"
                      >
                        <Compass size={12} />
                        Explore communities
                      </Link>
                    </div>
                    {communities.length > 0 && (
                      <div className="relative mb-2">
                        <Search
                          size={14}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        />
                        <input
                          value={communitySearch}
                          onChange={(e) => setCommunitySearch(e.target.value)}
                          placeholder="Search your joined communities..."
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                        />
                      </div>
                    )}
                    <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
                      {communities.length === 0 ? (
                        <div className="py-6 px-3 text-center">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            You haven't joined any communities yet.
                          </p>
                          <Link
                            to="/communities"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover shadow-xs"
                          >
                            <Compass size={12} />
                            Explore communities
                          </Link>
                        </div>
                      ) : filteredCommunities.length === 0 ? (
                        <p className="py-4 text-center text-xs text-neutral-400">
                          No joined community matches "{communitySearch}"
                        </p>
                      ) : (
                        filteredCommunities.map((c) => {
                          const selected = selectedCommunities.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCommunitySelection(c.id)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selected
                                  ? "bg-brand/10 text-brand dark:bg-brand/20"
                                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                }`}
                            >
                              <span>d/{c.slug}</span>
                              {selected && <Check size={14} />}
                            </button>
                          );
                        })
                      )}
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
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${isSelected
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
                className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publishing ? "Posting\u2026" : "Post Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Board Warning Dialog for Posting */}
      {privatePostWarningOpen && (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Turn Board Public First
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  This board is currently <span className="font-semibold text-neutral-800 dark:text-neutral-200">Private</span>. Only public boards can be posted to the community feed. Please change the board visibility to public first.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrivatePostWarningOpen(false)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleMakePublicAndPost()}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover shadow-xs"
              >
                <Globe size={13} />
                <span>Turn Public & Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Board Warning Dialog for Posting */}
      {privatePostWarningOpen && (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Turn Board Public First
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  This board is currently <span className="font-semibold text-neutral-800 dark:text-neutral-200">Private</span>. Only public boards can be posted to the community feed. Please change the board visibility to public first.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrivatePostWarningOpen(false)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleMakePublicAndPost()}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover shadow-xs"
              >
                <Globe size={13} />
                <span>Turn Public & Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}



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
                  className={`rounded-xl border p-3 text-left transition ${board.visibility === "private"
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
                  className={`rounded-xl border p-3 text-left transition ${board.visibility === "public"
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
    </div>
  );
}
