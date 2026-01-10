"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Badge,
  Avatar,
  Rating,
  Card,
  SimpleGrid,
  Button,
  Modal,
  Textarea,
  Select,
  Loader,
  Center,
  Alert,
  ActionIcon,
  Tooltip,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconMapPin,
  IconClock,
  IconBriefcase,
  IconStar,
  IconArrowLeft,
  IconPencil,
  IconMessage,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSession, getUserRole } from "@/lib/auth-client";
import { formatDistanceToNow } from "date-fns";

interface ProviderProfile {
  id: string;
  userId: string;
  bio: string | null;
  yearsOfExperience: number;
  address: string | null;
  serviceRadius: number;
  isAvailable: boolean;
  averageRating: string | null;
  totalReviews: number;
  verifiedAt: string | null;
  createdAt: string;
  userName: string;
  userImage: string | null;
  completedJobs: number;
  services: Array<{
    id: string;
    serviceTypeId: string;
    hourlyRate: string | null;
    description: string | null;
    serviceName: string;
    serviceIcon: string | null;
  }>;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  providerResponse: string | null;
  providerRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  reviewerName: string;
  reviewerImage: string | null;
}

interface EligibleRequest {
  id: string;
  description: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

async function fetchProvider(id: string): Promise<ProviderProfile> {
  const res = await fetch(`/api/providers/${id}`);
  if (!res.ok) throw new Error("Failed to fetch provider");
  return res.json();
}

async function fetchReviews(providerId: string): Promise<Review[]> {
  const res = await fetch(`/api/providers/${providerId}/reviews`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

async function fetchEligibleRequests(providerId: string): Promise<{ eligibleRequests: EligibleRequest[] }> {
  const res = await fetch(`/api/providers/${providerId}/eligible-requests`);
  if (!res.ok) throw new Error("Failed to fetch eligible requests");
  return res.json();
}

export default function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const role = getUserRole(session?.user);
  const queryClient = useQueryClient();

  // Modal states
  const [writeReviewOpened, { open: openWriteReview, close: closeWriteReview }] = useDisclosure(false);
  const [editReviewOpened, { open: openEditReview, close: closeEditReview }] = useDisclosure(false);
  const [respondOpened, { open: openRespond, close: closeRespond }] = useDisclosure(false);

  // Form states
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [respondingToReview, setRespondingToReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");

  // Queries
  const { data: provider, isLoading: isLoadingProvider, error: providerError } = useQuery({
    queryKey: ["provider", id],
    queryFn: () => fetchProvider(id),
  });

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => fetchReviews(id),
  });

  const { data: eligibleData } = useQuery({
    queryKey: ["eligible-requests", id],
    queryFn: () => fetchEligibleRequests(id),
    enabled: !!session?.user,
  });

  // Check if current user is the provider
  const isOwnProfile = session?.user?.id === provider?.userId;

  // Can edit review (within 7 days)
  const canEditReview = (review: Review) => {
    if (review.userId !== session?.user?.id) return false;
    const createdAt = new Date(review.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdAt > sevenDaysAgo;
  };

  // Mutations
  const createReviewMutation = useMutation({
    mutationFn: async (data: { requestId: string; rating: number; comment: string }) => {
      const res = await fetch(`/api/providers/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
      queryClient.invalidateQueries({ queryKey: ["provider", id] });
      queryClient.invalidateQueries({ queryKey: ["eligible-requests", id] });
      notifications.show({
        title: "Review submitted",
        message: "Thank you for your feedback!",
        color: "green",
      });
      closeWriteReview();
      setRating(5);
      setComment("");
      setSelectedRequestId(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async (data: { id: string; rating: number; comment: string }) => {
      const res = await fetch(`/api/reviews/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: data.rating, comment: data.comment }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
      queryClient.invalidateQueries({ queryKey: ["provider", id] });
      notifications.show({
        title: "Review updated",
        message: "Your review has been updated.",
        color: "green",
      });
      closeEditReview();
      setEditingReview(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const respondToReviewMutation = useMutation({
    mutationFn: async (data: { id: string; providerResponse: string }) => {
      const res = await fetch(`/api/reviews/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerResponse: data.providerResponse }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to respond to review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
      notifications.show({
        title: "Response added",
        message: "Your response has been added to the review.",
        color: "green",
      });
      closeRespond();
      setRespondingToReview(null);
      setResponseText("");
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmitReview = () => {
    if (!selectedRequestId) {
      notifications.show({
        title: "Error",
        message: "Please select a service to review",
        color: "red",
      });
      return;
    }
    createReviewMutation.mutate({
      requestId: selectedRequestId,
      rating,
      comment,
    });
  };

  const handleUpdateReview = () => {
    if (!editingReview) return;
    updateReviewMutation.mutate({
      id: editingReview.id,
      rating,
      comment,
    });
  };

  const handleRespondToReview = () => {
    if (!respondingToReview || !responseText.trim()) return;
    respondToReviewMutation.mutate({
      id: respondingToReview.id,
      providerResponse: responseText.trim(),
    });
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setRating(review.rating);
    setComment(review.comment || "");
    openEditReview();
  };

  const openRespondModal = (review: Review) => {
    setRespondingToReview(review);
    setResponseText(review.providerResponse || "");
    openRespond();
  };

  if (isLoadingProvider) {
    return (
      <Center py="xl">
        <Loader color="gold" />
      </Center>
    );
  }

  if (providerError || !provider) {
    return (
      <Alert color="red" title="Error">
        Failed to load provider profile. Please try again.
      </Alert>
    );
  }

  const avgRating = provider.averageRating ? parseFloat(provider.averageRating) : 0;
  const isVerified = !!provider.verifiedAt;
  const eligibleRequests = eligibleData?.eligibleRequests || [];
  const canWriteReview = eligibleRequests.length > 0 && !isOwnProfile && role === "user";

  return (
    <Stack gap="lg">
      {/* Back button */}
      <Group>
        <Button
          component={Link}
          href="/dashboard/providers"
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
        >
          Back to Providers
        </Button>
      </Group>

      {/* Provider Hero Section */}
      <Paper withBorder p="xl" radius="lg">
        <Stack gap="md">
          {/* Top row: Avatar, Name, Badges, Rating */}
          <Group gap="md" wrap="wrap">
            <Avatar
              src={provider.userImage}
              size={60}
              radius="xl"
              color="gold"
            >
              {provider.userName.charAt(0).toUpperCase()}
            </Avatar>

            <Title order={2}>{provider.userName}</Title>

            {isVerified && (
              <Tooltip label="Verified Provider">
                <Badge
                  color="green"
                  variant="light"
                  leftSection={<IconCheck size={12} />}
                >
                  Verified
                </Badge>
              </Tooltip>
            )}

            <Badge
              color={provider.isAvailable ? "green" : "gray"}
              variant={provider.isAvailable ? "filled" : "outline"}
            >
              {provider.isAvailable ? "Available" : "Unavailable"}
            </Badge>

            <Group gap="xs">
              <Rating value={avgRating} fractions={2} readOnly size="md" />
              <Text fw={600}>{avgRating.toFixed(1)}</Text>
              <Text c="dimmed">({provider.totalReviews} reviews)</Text>
            </Group>
          </Group>

          {/* Bio - full width */}
          {provider.bio && (
            <Text c="dimmed" size="md">
              {provider.bio}
            </Text>
          )}

          {/* Meta info - full width */}
          <Group gap="lg">
            {provider.yearsOfExperience > 0 && (
              <Group gap={4}>
                <IconClock size={16} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  {provider.yearsOfExperience} years experience
                </Text>
              </Group>
            )}
            {provider.address && (
              <Group gap={4}>
                <IconMapPin size={16} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  {provider.address}
                </Text>
              </Group>
            )}
            <Group gap={4}>
              <IconBriefcase size={16} color="var(--mantine-color-dimmed)" />
              <Text size="sm" c="dimmed">
                {provider.completedJobs} jobs completed
              </Text>
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Card withBorder p="lg" radius="md">
          <Stack gap={4} align="center">
            <IconBriefcase size={32} color="var(--mantine-color-gold-6)" />
            <Text size="xl" fw={700}>{provider.completedJobs}</Text>
            <Text size="sm" c="dimmed">Jobs Completed</Text>
          </Stack>
        </Card>
        <Card withBorder p="lg" radius="md">
          <Stack gap={4} align="center">
            <IconStar size={32} color="var(--mantine-color-yellow-6)" />
            <Text size="xl" fw={700}>{avgRating.toFixed(1)}</Text>
            <Text size="sm" c="dimmed">Average Rating</Text>
          </Stack>
        </Card>
        <Card withBorder p="lg" radius="md">
          <Stack gap={4} align="center">
            <IconClock size={32} color="var(--mantine-color-blue-6)" />
            <Text size="xl" fw={700}>{provider.yearsOfExperience}</Text>
            <Text size="sm" c="dimmed">Years Experience</Text>
          </Stack>
        </Card>
        <Card withBorder p="lg" radius="md">
          <Stack gap={4} align="center">
            <IconMapPin size={32} color="var(--mantine-color-green-6)" />
            <Text size="xl" fw={700}>{provider.serviceRadius}km</Text>
            <Text size="sm" c="dimmed">Service Radius</Text>
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Services Section */}
      <Paper withBorder p="lg" radius="md">
        <Title order={4} mb="md">Services Offered</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {provider.services.map((service) => (
            <Card key={service.id} withBorder p="md" radius="md">
              <Group gap="xs" mb="xs">
                {service.serviceIcon && <Text size="lg">{service.serviceIcon}</Text>}
                <Text fw={600}>{service.serviceName}</Text>
              </Group>
              {service.hourlyRate && (
                <Badge color="gold" variant="light" mb="xs">
                  KSh {service.hourlyRate}/hr
                </Badge>
              )}
              {service.description && (
                <Text size="sm" c="dimmed" lineClamp={2}>
                  {service.description}
                </Text>
              )}
            </Card>
          ))}
        </SimpleGrid>
      </Paper>

      {/* Reviews Section */}
      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Reviews ({provider.totalReviews})</Title>
          {canWriteReview && (
            <Button
              variant="gradient"
              gradient={{ from: "gold.5", to: "orange.5", deg: 135 }}
              leftSection={<IconStar size={16} />}
              onClick={openWriteReview}
            >
              Write a Review
            </Button>
          )}
        </Group>

        {isLoadingReviews ? (
          <Center py="xl">
            <Loader color="gold" />
          </Center>
        ) : reviews.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No reviews yet. Be the first to review!
          </Text>
        ) : (
          <Stack gap="md">
            {reviews.map((review) => (
              <Card key={review.id} withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="md">
                    <Avatar
                      src={review.reviewerImage}
                      size={40}
                      radius="xl"
                      color="blue"
                    >
                      {review.reviewerName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack gap={2}>
                      <Text fw={600}>{review.reviewerName}</Text>
                      <Group gap="xs">
                        <Rating value={review.rating} readOnly size="sm" />
                        <Text size="xs" c="dimmed">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </Text>
                        {review.updatedAt !== review.createdAt && (
                          <Text size="xs" c="dimmed">(edited)</Text>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                  <Group gap="xs">
                    {canEditReview(review) && (
                      <Tooltip label="Edit review">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => openEditModal(review)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {isOwnProfile && !review.providerResponse && (
                      <Tooltip label="Respond to review">
                        <ActionIcon
                          variant="subtle"
                          color="gold"
                          onClick={() => openRespondModal(review)}
                        >
                          <IconMessage size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>

                {review.comment && (
                  <Text size="sm" mt="xs">
                    {review.comment}
                  </Text>
                )}

                {/* Provider Response */}
                {review.providerResponse && (
                  <Box
                    mt="md"
                    p="sm"
                    style={{
                      backgroundColor: "var(--mantine-color-gray-light)",
                      borderRadius: "var(--mantine-radius-md)",
                      borderLeft: "3px solid var(--mantine-color-gold-6)",
                    }}
                  >
                    <Group gap="xs" mb="xs">
                      <IconMessage size={14} color="var(--mantine-color-gold-6)" />
                      <Text size="sm" fw={600}>Provider Response</Text>
                      {review.providerRespondedAt && (
                        <Text size="xs" c="dimmed">
                          {formatDistanceToNow(new Date(review.providerRespondedAt), { addSuffix: true })}
                        </Text>
                      )}
                    </Group>
                    <Text size="sm">{review.providerResponse}</Text>
                  </Box>
                )}
              </Card>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Write Review Modal */}
      <Modal
        opened={writeReviewOpened}
        onClose={closeWriteReview}
        title="Write a Review"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Select Service"
            placeholder="Choose a completed service to review"
            data={eligibleRequests.map((req) => ({
              value: req.id,
              label: `${req.description.slice(0, 50)}${req.description.length > 50 ? "..." : ""} (${req.status})`,
            }))}
            value={selectedRequestId}
            onChange={setSelectedRequestId}
            required
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>Rating</Text>
            <Rating value={rating} onChange={setRating} size="lg" />
          </Stack>

          <Textarea
            label="Comment (optional)"
            placeholder="Share your experience with this provider..."
            minRows={4}
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeWriteReview}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "gold.5", to: "orange.5", deg: 135 }}
              onClick={handleSubmitReview}
              loading={createReviewMutation.isPending}
            >
              Submit Review
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Review Modal */}
      <Modal
        opened={editReviewOpened}
        onClose={closeEditReview}
        title="Edit Your Review"
        size="md"
      >
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={500}>Rating</Text>
            <Rating value={rating} onChange={setRating} size="lg" />
          </Stack>

          <Textarea
            label="Comment"
            placeholder="Share your experience with this provider..."
            minRows={4}
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
          />

          <Text size="xs" c="dimmed">
            Note: You can only edit your review within 7 days of posting.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeEditReview}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "gold.5", to: "orange.5", deg: 135 }}
              onClick={handleUpdateReview}
              loading={updateReviewMutation.isPending}
            >
              Update Review
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Respond to Review Modal */}
      <Modal
        opened={respondOpened}
        onClose={closeRespond}
        title="Respond to Review"
        size="md"
      >
        <Stack gap="md">
          {respondingToReview && (
            <Card withBorder p="sm" radius="md">
              <Group gap="xs" mb="xs">
                <Rating value={respondingToReview.rating} readOnly size="sm" />
                <Text size="sm" fw={600}>{respondingToReview.reviewerName}</Text>
              </Group>
              {respondingToReview.comment && (
                <Text size="sm" c="dimmed">{respondingToReview.comment}</Text>
              )}
            </Card>
          )}

          <Textarea
            label="Your Response"
            placeholder="Thank the reviewer or address their feedback..."
            minRows={4}
            value={responseText}
            onChange={(e) => setResponseText(e.currentTarget.value)}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeRespond}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "gold.5", to: "orange.5", deg: 135 }}
              onClick={handleRespondToReview}
              loading={respondToReviewMutation.isPending}
              disabled={!responseText.trim()}
            >
              Submit Response
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
