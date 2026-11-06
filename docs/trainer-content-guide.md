# Trainer guide: Training Content

Use **Training Content** to manage reusable milestones and build training plans.
Open `/trainer/plans` after signing in as a trainer. The two tabs are **Training
Plans** and **Milestone Library**. On phones, use the branch icon in the bottom
navigation; its accessible label is Training Content.

## Find or create a plan

The Training Plans tab has one foundation master and compact role-variant rows.
Each variant shows its title, department/position, version, milestone count and
enrolled trainee count.

- **Create role variant** creates a reusable track from the foundation.
- Search by title, department or position, or filter by status.
- **Edit details** opens inline title/tag and default-node editing. Cancel
  discards that form; saving details does not publish a new curriculum.
- **Edit plan** or the variant title opens its builder.
- The row's more-actions menu contains **Delete variant**, subject to the
  existing enrollment/protection rules.
- Individual trainee paths are in **Trainees → trainee profile**, outside the
  reusable catalog. Use **Customize Individual Path** there. Promotion to a
  reusable variant is also available from the profile.

[Desktop catalog](images/trainer-content/plans-desktop.png)

## Create a milestone and attach materials

1. Open **Milestone Library**. Search code/title and filter by pillar or origin
   (**BEAT standard** or **Custom**). Rows show material and reusable-plan counts.
2. Choose **Create milestone**. Enter a unique code, title, description/criteria
   and pillar. Choose **Save shared milestone**.
3. The same inspector now shows the saved milestone and its materials section.
   No reload or second search is needed. Upload controls appear only after the
   milestone has saved successfully.
4. Drop or choose MP4, PDF or PPTX files, up to **50 MB per file**. Wait for the
   completed upload and updated material count.
5. Choose **Preview / download** on a file. PDF/video previews and presentation
   preview/download options use the existing material viewer. Close the preview
   to return to the same inspector.

An existing code produces a conflict rather than overwriting its milestone.
Failed saves retain the entered fields. Failed/canceled uploads retain the saved
milestone: retry uploading without creating it again. A milestone with zero
materials is valid.

Desktop uses a right inspector; phones use a full-screen inspector with scrolling.
Close or press Escape to return to the list with filters, scroll and focus
preserved. Escape in a material preview closes that preview first.

[Mobile creation](images/trainer-content/create-mobile.png) ·
[Mobile materials](images/trainer-content/materials-mobile.png) ·
[Desktop library/materials](images/trainer-content/library-desktop.png)

## Add the milestone to a plan

From the library inspector, choose **Add to plan**, select the master or role
variant, then **Open plan to add**. Private trainee instances and archived plans
are excluded from this picker.

In the builder, use **Create working draft** or **Open working draft** if offered.
Choose **Add to this draft** explicitly. Merely opening the link does not insert
or publish anything. **Already in this draft** prevents duplicate insertion.

When already editing a draft, open **Milestones** (accessible label: Open
milestone library). Its filter starts with the current pillar; **All Paths**
browses the others. Add an existing milestone, or choose **Create shared
milestone**, save it and upload in that inspector, then **Add to this draft**.
You do not need to select the same plan again.

The existing **Add Milestone** form also supports plan-only content. Leave
**Save to Shared Milestone Library** unchecked to keep it private. Plan-only
content without a saved shared definition has no shared-material upload target.
For the create-and-upload workflow, use **Create shared milestone**.

## Arrange and save the draft

The builder opens in **Outline**, showing the five pillars. Expand a pillar or
milestone, use **Inspect** for its editor, and reorder with the drag handle or
explicit move buttons. Desktop has collapsible path navigation and **Whole
plan**; mobile has a development-path selector. Empty pillars remain available.

**Canvas** remains available on desktop with connections, Arrange, Fit, zoom and
inspection. Switching views keeps the same working draft. Mobile uses Outline.

The save actions have different scopes:

| Action | What happens |
| --- | --- |
| **Apply to draft** | Applies that inspector's fields to the working plan in the browser. Use Save draft next. |
| **Save draft** | Persists applied plan changes. Unapplied inspector fields are excluded. Trainees do not receive a newly published curriculum. |
| **Save shared details** | Saves permitted custom-library metadata and synchronizes matching draft nodes. Published metadata snapshots stay intact. Canonical BEAT fields are protected. |
| Material upload/reorder/delete | Saves independently and affects all references to that shared milestone, including published/historical paths and private instances. Review the impact counts. |
| **Publish** | Opens the existing impact and recipient review before applying a published version. |

The header distinguishes saved/unsaved draft changes from inspector forms that
have not been applied. Closing an inspector retains staged fields; **Cancel**
discards that form. Neither action undoes an already saved shared-material change.
Uploading the same filename adds a separate file; it does not replace the old one.

[Desktop outline](images/trainer-content/outline-desktop.png) ·
[Mobile outline](images/trainer-content/outline-mobile.png)

## Review impact and publish

Choose **Publish**, inspect the version edit summary, and review the existing
trainee synchronization/recipient controls before confirming. Cancel returns to
editing. Published versions are read-only; use a working draft for further edits.
Versions and version history remain available from the builder header.

For an individual trainee path, publishing offers the existing scopes: only this
trainee, selected trainees through the shared variant, or a new reusable variant.
Review recipient and per-trainee conflict/impact information. The default
individual scope does not automatically select other trainees.

Removing milestones can trigger a progress warning. Existing progress is
preserved/archived through the normal publishing rules; original verification
hashes and revocation history are retained. A shared-library save is never a
trainer verification.

[Desktop publish review](images/trainer-content/publish-desktop.png) ·
[Mobile publish review](images/trainer-content/publish-mobile.png)

## Continue trainee and verification work

**Hub**, **Verifications** (`/trainer/queue`) and **Trainees** remain in the main
navigation. Review submissions and **1-Click Verify & Stamp** remain in the queue.
Trainer notifications still open review work. Trainee profiles retain assignment,
individual-path customization, promotion, stamp revocation and audit history.

Trainees retain Dashboard, My passport and Notifications. They open a milestone's
module to view materials, write a reflection and submit for review. After trainer
verification, the first notification opening celebrates the stamp; later openings
return to the module. Revocation feedback and fresh review requests retain their
existing behavior. Content editing does not award a stamp or automatically
complete a milestone.

Screenshots show disposable walkthrough fixtures, not production training content.
They were captured from the verified production build on 2026-11-06. For test
commands, evidence and known limits, see the [implementation handoff](trainer-content-handoff.md).
