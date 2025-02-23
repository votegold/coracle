<script lang="ts">
  import {find, assocPath} from "ramda"
  import {onMount} from "svelte"
  import {now, createScroller, formatTimestampAsDate} from "src/util/misc"
  import {noteKinds, reactionKinds} from "src/util/nostr"
  import Tabs from "src/partials/Tabs.svelte"
  import Content from "src/partials/Content.svelte"
  import NotificationReactions from "src/app/views/NotificationReactions.svelte"
  import NotificationMention from "src/app/views/NotificationMention.svelte"
  import NotificationReplies from "src/app/views/NotificationReplies.svelte"
  import {router} from "src/app/router"
  import type {Event} from "src/engine"
  import {pubkey, sessions, notifications, groupNotifications, loadNotifications} from "src/engine"

  const tabs = ["Mentions & Replies", "Reactions"]

  const throttledNotifications = notifications.throttle(300)

  const setActiveTab = tab => router.at("notifications").at(tab).push()

  const getLineText = i => {
    const cur = tabNotifications[i]
    const prev = tabNotifications[i - 1]

    if (!prev || formatTimestampAsDate(prev.timestamp) !== formatTimestampAsDate(cur.timestamp)) {
      return formatTimestampAsDate(cur.timestamp)
    }
  }

  export let activeTab = tabs[0]

  let limit = 4

  $: tabKinds = activeTab === tabs[0] ? noteKinds : reactionKinds.concat(9734)

  $: groupedNotifications = groupNotifications($throttledNotifications, tabKinds).slice(0, limit)

  $: tabNotifications =
    activeTab === tabs[0]
      ? groupedNotifications.filter(
          n => !n.event || find((e: Event) => noteKinds.includes(e.kind), n.interactions)
        )
      : groupedNotifications.filter(n =>
          find((e: Event) => reactionKinds.includes(e.kind), n.interactions)
        )

  document.title = "Notifications"

  onMount(() => {
    loadNotifications()

    const unsub = throttledNotifications.subscribe(() => {
      sessions.update(assocPath([$pubkey, "notifications_last_synced"], now()))
    })

    const scroller = createScroller(async () => {
      limit += 4
    })

    return () => {
      unsub()
      scroller.stop()
    }
  })
</script>

<Content>
  <Tabs {tabs} {activeTab} {setActiveTab} />
  {#each tabNotifications as notification, i (notification.key)}
    {@const lineText = getLineText(i)}
    {#if lineText}
      <div class="flex items-center gap-4">
        <small class="whitespace-nowrap text-gray-1">{lineText}</small>
        <div class="h-px w-full bg-gray-6" />
      </div>
    {/if}
    {#if !notification.event}
      <NotificationMention {notification} />
    {:else if activeTab === tabs[0]}
      <NotificationReplies {notification} />
    {:else}
      <NotificationReactions {notification} />
    {/if}
  {:else}
    <Content size="lg" class="text-center">No notifications found - check back later!</Content>
  {/each}
</Content>
