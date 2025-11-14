.
├── components.json
├── eslint.config.js
├── package-lock.json
├── package.json
├── README.md
├── src
│   ├── app.css
│   ├── app.d.ts
│   ├── app.html
│   ├── hooks.server.ts
│   ├── lib
│   │   ├── assets
│   │   │   └── favicon.svg
│   │   ├── auth-client.ts
│   │   ├── components
│   │   │   ├── sidebar
│   │   │   │   ├── app-sidebar.svelte
│   │   │   │   ├── nav-main.svelte
│   │   │   │   ├── nav-projects.svelte
│   │   │   │   ├── nav-user.svelte
│   │   │   │   ├── team-switcher.svelte
│   │   │   │   └── top-navbar.svelte
│   │   │   └── ui
│   │   │       ├── alert-dialog
│   │   │       │   ├── alert-dialog-action.svelte
│   │   │       │   ├── alert-dialog-cancel.svelte
│   │   │       │   ├── alert-dialog-content.svelte
│   │   │       │   ├── alert-dialog-description.svelte
│   │   │       │   ├── alert-dialog-footer.svelte
│   │   │       │   ├── alert-dialog-header.svelte
│   │   │       │   ├── alert-dialog-overlay.svelte
│   │   │       │   ├── alert-dialog-title.svelte
│   │   │       │   ├── alert-dialog-trigger.svelte
│   │   │       │   └── index.ts
│   │   │       ├── avatar
│   │   │       │   ├── avatar-fallback.svelte
│   │   │       │   ├── avatar-image.svelte
│   │   │       │   ├── avatar.svelte
│   │   │       │   └── index.ts
│   │   │       ├── badge
│   │   │       │   ├── badge.svelte
│   │   │       │   └── index.ts
│   │   │       ├── breadcrumb
│   │   │       │   ├── breadcrumb-ellipsis.svelte
│   │   │       │   ├── breadcrumb-item.svelte
│   │   │       │   ├── breadcrumb-link.svelte
│   │   │       │   ├── breadcrumb-list.svelte
│   │   │       │   ├── breadcrumb-page.svelte
│   │   │       │   ├── breadcrumb-separator.svelte
│   │   │       │   ├── breadcrumb.svelte
│   │   │       │   └── index.ts
│   │   │       ├── button
│   │   │       │   ├── button.svelte
│   │   │       │   └── index.ts
│   │   │       ├── card
│   │   │       │   ├── card-action.svelte
│   │   │       │   ├── card-content.svelte
│   │   │       │   ├── card-description.svelte
│   │   │       │   ├── card-footer.svelte
│   │   │       │   ├── card-header.svelte
│   │   │       │   ├── card-title.svelte
│   │   │       │   ├── card.svelte
│   │   │       │   └── index.ts
│   │   │       ├── checkbox
│   │   │       │   ├── checkbox.svelte
│   │   │       │   └── index.ts
│   │   │       ├── collapsible
│   │   │       │   ├── collapsible-content.svelte
│   │   │       │   ├── collapsible-trigger.svelte
│   │   │       │   ├── collapsible.svelte
│   │   │       │   └── index.ts
│   │   │       ├── command
│   │   │       │   ├── command-dialog.svelte
│   │   │       │   ├── command-empty.svelte
│   │   │       │   ├── command-group.svelte
│   │   │       │   ├── command-input.svelte
│   │   │       │   ├── command-item.svelte
│   │   │       │   ├── command-link-item.svelte
│   │   │       │   ├── command-list.svelte
│   │   │       │   ├── command-separator.svelte
│   │   │       │   ├── command-shortcut.svelte
│   │   │       │   ├── command.svelte
│   │   │       │   └── index.ts
│   │   │       ├── data-table
│   │   │       │   ├── data-table.svelte.ts
│   │   │       │   ├── flex-render.svelte
│   │   │       │   ├── index.ts
│   │   │       │   └── render-helpers.ts
│   │   │       ├── dialog
│   │   │       │   ├── dialog-close.svelte
│   │   │       │   ├── dialog-content.svelte
│   │   │       │   ├── dialog-description.svelte
│   │   │       │   ├── dialog-footer.svelte
│   │   │       │   ├── dialog-header.svelte
│   │   │       │   ├── dialog-overlay.svelte
│   │   │       │   ├── dialog-title.svelte
│   │   │       │   ├── dialog-trigger.svelte
│   │   │       │   └── index.ts
│   │   │       ├── dropdown-menu
│   │   │       │   ├── dropdown-menu-checkbox-item.svelte
│   │   │       │   ├── dropdown-menu-content.svelte
│   │   │       │   ├── dropdown-menu-group-heading.svelte
│   │   │       │   ├── dropdown-menu-group.svelte
│   │   │       │   ├── dropdown-menu-item.svelte
│   │   │       │   ├── dropdown-menu-label.svelte
│   │   │       │   ├── dropdown-menu-radio-group.svelte
│   │   │       │   ├── dropdown-menu-radio-item.svelte
│   │   │       │   ├── dropdown-menu-separator.svelte
│   │   │       │   ├── dropdown-menu-shortcut.svelte
│   │   │       │   ├── dropdown-menu-sub-content.svelte
│   │   │       │   ├── dropdown-menu-sub-trigger.svelte
│   │   │       │   ├── dropdown-menu-trigger.svelte
│   │   │       │   └── index.ts
│   │   │       ├── file-drop-zone
│   │   │       │   ├── file-drop-zone.svelte
│   │   │       │   ├── index.ts
│   │   │       │   └── types.ts
│   │   │       ├── input
│   │   │       │   ├── index.ts
│   │   │       │   └── input.svelte
│   │   │       ├── item
│   │   │       │   ├── index.ts
│   │   │       │   ├── item-actions.svelte
│   │   │       │   ├── item-content.svelte
│   │   │       │   ├── item-description.svelte
│   │   │       │   ├── item-footer.svelte
│   │   │       │   ├── item-group.svelte
│   │   │       │   ├── item-header.svelte
│   │   │       │   ├── item-media.svelte
│   │   │       │   ├── item-separator.svelte
│   │   │       │   ├── item-title.svelte
│   │   │       │   └── item.svelte
│   │   │       ├── label
│   │   │       │   ├── index.ts
│   │   │       │   └── label.svelte
│   │   │       ├── messageinput
│   │   │       │   ├── index.ts
│   │   │       │   └── message-input.svelte
│   │   │       ├── popover
│   │   │       │   ├── index.ts
│   │   │       │   ├── popover-content.svelte
│   │   │       │   └── popover-trigger.svelte
│   │   │       ├── progress
│   │   │       │   ├── index.ts
│   │   │       │   └── progress.svelte
│   │   │       ├── rename
│   │   │       │   ├── index.ts
│   │   │       │   ├── rename-cancel.svelte
│   │   │       │   ├── rename-edit.svelte
│   │   │       │   ├── rename-provider.svelte
│   │   │       │   ├── rename-save.svelte
│   │   │       │   ├── rename.svelte
│   │   │       │   ├── rename.svelte.ts
│   │   │       │   └── types.ts
│   │   │       ├── select
│   │   │       │   ├── index.ts
│   │   │       │   ├── select-content.svelte
│   │   │       │   ├── select-group-heading.svelte
│   │   │       │   ├── select-group.svelte
│   │   │       │   ├── select-item.svelte
│   │   │       │   ├── select-label.svelte
│   │   │       │   ├── select-scroll-down-button.svelte
│   │   │       │   ├── select-scroll-up-button.svelte
│   │   │       │   ├── select-separator.svelte
│   │   │       │   └── select-trigger.svelte
│   │   │       ├── separator
│   │   │       │   ├── index.ts
│   │   │       │   └── separator.svelte
│   │   │       ├── sheet
│   │   │       │   ├── index.ts
│   │   │       │   ├── sheet-close.svelte
│   │   │       │   ├── sheet-content.svelte
│   │   │       │   ├── sheet-description.svelte
│   │   │       │   ├── sheet-footer.svelte
│   │   │       │   ├── sheet-header.svelte
│   │   │       │   ├── sheet-overlay.svelte
│   │   │       │   ├── sheet-title.svelte
│   │   │       │   └── sheet-trigger.svelte
│   │   │       ├── sidebar
│   │   │       │   ├── constants.ts
│   │   │       │   ├── context.svelte.ts
│   │   │       │   ├── index.ts
│   │   │       │   ├── sidebar-content.svelte
│   │   │       │   ├── sidebar-footer.svelte
│   │   │       │   ├── sidebar-group-action.svelte
│   │   │       │   ├── sidebar-group-content.svelte
│   │   │       │   ├── sidebar-group-label.svelte
│   │   │       │   ├── sidebar-group.svelte
│   │   │       │   ├── sidebar-header.svelte
│   │   │       │   ├── sidebar-input.svelte
│   │   │       │   ├── sidebar-inset.svelte
│   │   │       │   ├── sidebar-menu-action.svelte
│   │   │       │   ├── sidebar-menu-badge.svelte
│   │   │       │   ├── sidebar-menu-button.svelte
│   │   │       │   ├── sidebar-menu-item.svelte
│   │   │       │   ├── sidebar-menu-skeleton.svelte
│   │   │       │   ├── sidebar-menu-sub-button.svelte
│   │   │       │   ├── sidebar-menu-sub-item.svelte
│   │   │       │   ├── sidebar-menu-sub.svelte
│   │   │       │   ├── sidebar-menu.svelte
│   │   │       │   ├── sidebar-provider.svelte
│   │   │       │   ├── sidebar-rail.svelte
│   │   │       │   ├── sidebar-separator.svelte
│   │   │       │   ├── sidebar-trigger.svelte
│   │   │       │   └── sidebar.svelte
│   │   │       ├── skeleton
│   │   │       │   ├── index.ts
│   │   │       │   └── skeleton.svelte
│   │   │       ├── spinner
│   │   │       │   ├── index.ts
│   │   │       │   └── spinner.svelte
│   │   │       ├── switch
│   │   │       │   ├── index.ts
│   │   │       │   └── switch.svelte
│   │   │       ├── table
│   │   │       │   ├── index.ts
│   │   │       │   ├── table-body.svelte
│   │   │       │   ├── table-caption.svelte
│   │   │       │   ├── table-cell.svelte
│   │   │       │   ├── table-footer.svelte
│   │   │       │   ├── table-head.svelte
│   │   │       │   ├── table-header.svelte
│   │   │       │   ├── table-row.svelte
│   │   │       │   └── table.svelte
│   │   │       ├── tags-input
│   │   │       │   ├── index.ts
│   │   │       │   ├── tags-input-tag.svelte
│   │   │       │   ├── tags-input.svelte
│   │   │       │   └── types.ts
│   │   │       ├── tagsinput
│   │   │       │   ├── index.ts
│   │   │       │   ├── tags-input-tag.svelte
│   │   │       │   ├── tags-input.svelte
│   │   │       │   └── types.ts
│   │   │       ├── textarea
│   │   │       │   ├── index.ts
│   │   │       │   └── textarea.svelte
│   │   │       ├── toast
│   │   │       │   ├── index.ts
│   │   │       │   └── toast.svelte
│   │   │       └── tooltip
│   │   │           ├── index.ts
│   │   │           ├── tooltip-content.svelte
│   │   │           └── tooltip-trigger.svelte
│   │   ├── email-messages.ts
│   │   ├── hooks
│   │   │   ├── is-mobile.svelte.ts
│   │   │   └── use-password-strength.svelte.ts
│   │   ├── icons
│   │   │   ├── change.svelte
│   │   │   ├── check-2.svelte
│   │   │   ├── clipboard-content.svelte
│   │   │   ├── connection-2.svelte
│   │   │   ├── download.svelte
│   │   │   ├── email.svelte
│   │   │   ├── envelope.svelte
│   │   │   ├── flag-7.svelte
│   │   │   ├── gear-3.svelte
│   │   │   ├── grid-square-circle-plus.svelte
│   │   │   ├── image.svelte
│   │   │   ├── inbox-arrow-up.svelte
│   │   │   ├── list-tree.svelte
│   │   │   ├── organization.svelte
│   │   │   ├── page.svelte
│   │   │   ├── paper-plane.svelte
│   │   │   ├── phone.svelte
│   │   │   ├── plus.svelte
│   │   │   ├── refresh.svelte
│   │   │   ├── search-content-2.svelte
│   │   │   ├── slider.svelte
│   │   │   ├── square-dashed-text-xmark.svelte
│   │   │   ├── tags.svelte
│   │   │   ├── ticket.svelte
│   │   │   ├── trash-2.svelte
│   │   │   ├── upload-4.svelte
│   │   │   ├── user-update.svelte
│   │   │   ├── users-sparkle.svelte
│   │   │   ├── v-shaped-arrow-down.svelte
│   │   │   ├── view-all.svelte
│   │   │   └── xmark.svelte
│   │   ├── index.ts
│   │   ├── server
│   │   │   ├── auth.ts
│   │   │   ├── db
│   │   │   │   ├── encrypt.ts
│   │   │   │   ├── instance.js
│   │   │   │   ├── models
│   │   │   │   │   ├── account.model.ts
│   │   │   │   │   ├── category.model.ts
│   │   │   │   │   ├── config.js
│   │   │   │   │   ├── config.model.ts
│   │   │   │   │   ├── image.model.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── priority.model.ts
│   │   │   │   │   ├── requester.model.ts
│   │   │   │   │   ├── session.model.ts
│   │   │   │   │   ├── status.model.ts
│   │   │   │   │   ├── tag.model.ts
│   │   │   │   │   ├── ticket-attachment.model.ts
│   │   │   │   │   ├── ticket-message.model.ts
│   │   │   │   │   ├── ticket.model.ts
│   │   │   │   │   ├── user.model.ts
│   │   │   │   │   └── verification.model.ts
│   │   │   │   ├── seed-database.ts
│   │   │   │   └── sync.ts
│   │   │   ├── email-instance.ts
│   │   │   ├── file-upload.ts
│   │   │   └── ticket.ts
│   │   ├── state
│   │   ├── types
│   │   │   ├── core.ts
│   │   │   ├── index.ts
│   │   │   ├── page-data.ts
│   │   │   ├── ticket-detail.ts
│   │   │   └── ticket-list.ts
│   │   ├── utils
│   │   │   ├── color.ts
│   │   │   ├── date.ts
│   │   │   ├── download.ts
│   │   │   ├── password.ts
│   │   │   ├── string.ts
│   │   │   └── timezones.ts
│   │   └── utils.ts
│   └── routes
│       ├── (index)
│       │   ├── (auth)
│       │   │   ├── +layout.svelte
│       │   │   ├── login
│       │   │   │   └── +page.svelte
│       │   │   └── register
│       │   │       └── +page.svelte
│       │   ├── api
│       │   │   ├── requesters
│       │   │   │   └── +server.ts
│       │   │   ├── ticket-messages
│       │   │   │   └── +server.ts
│       │   │   └── tickets
│       │   │       ├── +server.ts
│       │   │       ├── [id]
│       │   │       │   └── +server.ts
│       │   │       ├── bulk
│       │   │       │   └── +server.ts
│       │   │       └── export
│       │   │           └── +server.ts
│       │   ├── logo
│       │   │   └── +server.ts
│       │   └── setup
│       │       ├── +error.svelte
│       │       ├── +layout.server.ts
│       │       ├── +layout.svelte
│       │       ├── +page.svelte
│       │       ├── admin-account
│       │       │   ├── +page.svelte
│       │       │   └── +server.ts
│       │       ├── incoming-email
│       │       │   ├── +page.svelte
│       │       │   ├── +server.ts
│       │       │   └── test
│       │       │       └── +server.ts
│       │       ├── organization
│       │       │   ├── +page.svelte
│       │       │   └── +server.ts
│       │       ├── outgoing-email
│       │       │   ├── +page.svelte
│       │       │   ├── +server.ts
│       │       │   └── test
│       │       │       └── +server.ts
│       │       └── portal
│       │           ├── +page.svelte
│       │           └── +server.ts
│       ├── +layout.svelte
│       └── dashboard
│           ├── +layout.server.ts
│           ├── +layout.svelte
│           ├── +page.svelte
│           ├── settings
│           │   ├── attachments
│           │   │   ├── +page.svelte
│           │   │   └── +server.ts
│           │   ├── business-hours
│           │   │   ├── +page.svelte
│           │   │   └── +server.ts
│           │   ├── categories
│           │   │   ├── +page.svelte
│           │   │   └── +server.ts
│           │   ├── holidays
│           │   │   ├── +page.svelte
│           │   │   └── +server.ts
│           │   ├── incoming-email
│           │   │   └── +server.ts
│           │   ├── notifications
│           │   │   ├── +page.svelte
│           │   │   └── +server.ts
│           │   ├── organization
│           │   │   └── +server.ts
│           │   ├── outgoing-email
│           │   │   └── +server.ts
│           │   ├── portal
│           │   │   └── +server.ts
│           │   ├── priorities
│           │   │   ├── +page.svelte
│           │   │   └── +server.ts
│           │   └── statuses
│           │       ├── +page.svelte
│           │       └── +server.ts
│           └── tickets
│               ├── +layout.server.ts
│               ├── +page.server.ts
│               ├── +page.svelte
│               ├── [id]
│               │   ├── +page.server.ts
│               │   ├── +page.svelte
│               │   ├── [fileName]
│               │   │   └── +server.ts
│               │   ├── ticket-input.svelte
│               │   ├── ticket-message.svelte
│               │   ├── ticket-properties.svelte
│               │   ├── ticket-requester-dialog.svelte
│               │   └── ticket-requester.svelte
│               ├── all-tickets
│               │   ├── +page.server.ts
│               │   └── +page.svelte
│               ├── columns.ts
│               ├── data-bulk-actions-dialog.svelte
│               ├── data-delete-dialog.svelte
│               ├── data-export-dialog.svelte
│               ├── data-filter-dialog.svelte
│               ├── data-table-actions.svelte
│               ├── data-table-checkbox.svelte
│               ├── data-table-sort-button.svelte
│               ├── data-table.svelte
│               ├── my-tickets
│               │   ├── +page.server.ts
│               │   └── +page.svelte
│               ├── new-ticket
│               │   └── +page.svelte
│               └── ticket-table-page.svelte
├── static
│   ├── placeholder.svg
│   └── robots.txt
├── svelte.config.js
├── tree.md
├── tsconfig.json
├── vite.config.ts
└── worker
    ├── client.ts
    ├── index.ts
    ├── monitor.ts
    ├── process.ts
    └── sanitize.ts
