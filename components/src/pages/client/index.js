/**
 * @fileoverview Client entry point for reactive components
 *
 * @module pages/client
 * @description
 * Main client-side entry that registers all reactive components used in the collection of components.
 * This file is loaded on the client to enable interactive functionality for components
 * that require JavaScript behavior.
 *
 * Components registered:
 * - el-copy-button: Interactive copy button that copies code content to clipboard
 * - el-accordion: Interactive accordion with keyboard navigation and state control
 * - el-alert-dialog: Interactive alert dialog with keyboard navigation and state control
 * - el-dialog: Interactive dialog with keyboard navigation and state control
 * - el-dropdown-menu: Interactive dropdown menu with keyboard navigation and state control
 * - el-popover: Interactive popover with keyboard navigation and click-outside handling
 * - el-select-menu: Interactive select with keyboard navigation, filtering, and option management
 * - el-sidebar: Responsive sidebar with breakpoints, current page links, and custom events
 * - el-slider: Interactive slider with keyboard navigation and state control
 * - el-tabs: Interactive tab management with keyboard navigation and state control
 * - el-theme-toggle: Interactive theme toggle with persistence and system preference detection
 * - el-toaster: Toast notification system with auto-dismiss and pause on hover
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import "@components/accordion.client.js";
import "@components/alert-dialog.client.js";
import "@components/dialog.client.js";
import "@components/dropdown-menu.client.js";
import "@components/popover.client.js";
import "@components/select-menu.client.js";
import "@components/slider.client.js";
import "@components/tabs.client.js";
import "@components/toast.client.js";

import "../components/copy-button.client.js";
import "../components/sidebar.client.js";
import "../components/theme-selector.client.js";
import "../components/theme-toggle.client.js";
