import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace, fetchWorkspaces, deleteWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import { useOrganizationList, useClerk, useOrganization, useAuth } from "@clerk/react";
import toast from "react-hot-toast";

function WorkspaceDropdown() {

    const {setActive, userMemberships, isLoaded} = useOrganizationList({userMemberships: true});
    const { getToken } = useAuth();

    const { openCreateOrganization } = useClerk();
    const { organization } = useOrganization();

    const dispatch = useDispatch();
    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const navigate = useNavigate();

    // Sync Redux workspaces with Clerk organizations
    useEffect(() => {
        if (isLoaded && userMemberships?.data && workspaces.length > 0) {
            // Get current org IDs from Clerk
            const clerkOrgIds = new Set(userMemberships.data.map(m => m.organization.id));
            
            // Check if any Redux workspace isn't in Clerk (was deleted)
            const deletedWorkspaces = workspaces.filter(w => !clerkOrgIds.has(w.id));
            
            if (deletedWorkspaces.length > 0) {
                deletedWorkspaces.forEach(w => dispatch(deleteWorkspace(w.id)));
            }
        }
    }, [isLoaded, userMemberships?.data]);

    const onSelectWorkspace = (organizationId) => {
        setActive({ organization: organizationId });
        dispatch(setCurrentWorkspace(organizationId))
        setIsOpen(false);
        navigate('/')
    }

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (currentWorkspace && isLoaded && organization?.id !== currentWorkspace.id) {
            const isMember = userMemberships?.data?.some(m => m.organization.id === currentWorkspace.id);
            if (isMember) {
                setActive({ organization: currentWorkspace.id }).catch(console.error);
            } else if (userMemberships?.data?.length > 0) {
                setActive({ organization: userMemberships.data[0].organization.id }).catch(console.error);
                dispatch(setCurrentWorkspace(userMemberships.data[0].organization.id));
            } else {
                setActive({ organization: null }).catch(console.error);
            }
        } else if (isLoaded && userMemberships?.data?.length === 0 && organization?.id) {
            // Also clear if we have an active org in Clerk but no actual memberships
            setActive({ organization: null }).catch(console.error);
        }
    }, [currentWorkspace?.id, isLoaded, organization?.id, userMemberships?.data, dispatch, setActive]);


    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                <div className="flex items-center gap-3">
                    <img src={currentWorkspace?.image_url} alt={currentWorkspace?.name} className="w-8 h-8 rounded shadow" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {currentWorkspace?.name || "Select Workspace"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {userMemberships?.data?.map((membership) => (
                            <div 
                                key={membership.organization.id} 
                                onClick={() => onSelectWorkspace(membership.organization.id)} 
                                className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                            >
                                <img src={membership.organization.imageUrl} alt={membership.organization.name} className="w-6 h-6 rounded" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {membership.organization.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                        {membership.organization.membersCount || 0} members
                                    </p>
                                </div>
                                {currentWorkspace?.id === membership.organization.id && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div onClick={() => {openCreateOrganization(); setIsOpen(false);}} className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                            <Plus className="w-4 h-4" /> Create Workspace
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceDropdown;
