import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Admin Panel</CardTitle>
          <CardDescription>
            Coupon management system for Strapi v5
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Access the coupon editor to manage your promotional campaigns.
          </p>
          <Link to="/coupon-editor">
            <Button className="w-full">
              Go to Coupon Editor
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
