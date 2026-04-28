import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationPanel from "../ui/NotificationPanel";
import {
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Link, useNavigate } from "react-router-dom";

const roleColors = {
  admin: "bg-pink-100 text-pink-700",
  citizen: "bg-primary-100 text-primary-700",
  volunteer: "bg-teal-50 text-teal-700",
  ngo: "bg-warning-50 text-warning-700",
};

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    const paths = {
      admin: "/admin",
      citizen: "/citizen",
      volunteer: "/volunteer",
      ngo: "/ngo",
    };
    return paths[user?.role] || "/";
  };

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-100 h-14 sm:h-16"
    >
      <div className="flex items-center h-full px-3 sm:px-4 gap-2">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden flex-shrink-0 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <Bars3Icon className="h-5 w-5 text-neutral-600" />
        </button>

        {/* Brand */}
        <Link
          to={user ? getDashboardPath() : "/"}
          className="flex items-center gap-1.5 flex-shrink-0"
        >
          <div className="h-7 w-7 sm:h-8 sm:w-8 bg-primary-600 rounded-lg sm:rounded-xl flex items-center justify-center">
            <ShieldCheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          </div>
          <span className="font-display font-bold text-neutral-900 text-sm sm:text-base md:text-lg tracking-tight">
            e-<span className="text-primary-600">DisasterAid</span>
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationPanel />

          {/* Role badge — hidden on small mobile */}
          <span
            className={clsx(
              "hidden sm:inline-flex chip text-[10px] sm:text-xs",
              roleColors[user?.role],
            )}
          >
            {user?.role}
          </span>

          {/* Avatar */}
          <Link
            to="/profile"
            className={clsx(
              "h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl flex items-center justify-center",
              "font-display font-bold text-xs sm:text-sm flex-shrink-0 hover:ring-2 hover:ring-primary-300 transition-all",
              roleColors[user?.role] || "bg-neutral-100 text-neutral-600",
            )}
            title="View profile"
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </Link>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-danger-50 hover:text-danger-500 transition-colors text-neutral-400"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
